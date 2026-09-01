import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, ChevronLeft, Check, Mic, MonitorSmartphone, RotateCcw, Speaker, Vibrate, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/diagnostico/$token")({
  ssr: false,
  component: MobileDiagnosticPage,
});

type TestStatus = "aprovado" | "problema" | "indisponivel";
type TestItem = { tipo: string; titulo: string; descricao: string; icon: typeof MonitorSmartphone };

const TESTS: TestItem[] = [
  { tipo: "tela", titulo: "Tela", descricao: "Verifique manchas, pixels mortos, linhas e brilho nas cores.", icon: MonitorSmartphone },
  { tipo: "touch", titulo: "Touch", descricao: "Toque nos pontos e passe o dedo por toda a área.", icon: MonitorSmartphone },
  { tipo: "cores", titulo: "Cores", descricao: "Confira a reprodução das cores e a uniformidade.", icon: MonitorSmartphone },
  { tipo: "camera_traseira", titulo: "Câmera traseira", descricao: "Abra a câmera e confirme a imagem.", icon: Camera },
  { tipo: "camera_frontal", titulo: "Câmera frontal", descricao: "Abra a câmera e confirme a imagem.", icon: Camera },
  { tipo: "microfone", titulo: "Microfone", descricao: "Grave alguns segundos e reproduza o áudio.", icon: Mic },
  { tipo: "alto_falante", titulo: "Alto-falante", descricao: "Reproduza o som de teste.", icon: Speaker },
  { tipo: "vibracao", titulo: "Vibração", descricao: "Acione a vibração e confirme se a sentiu.", icon: Vibrate },
  { tipo: "movimento", titulo: "Movimento", descricao: "Movimente o aparelho para testar seus sensores.", icon: RotateCcw },
  { tipo: "flash", titulo: "Flash", descricao: "Tente acionar o flash da câmera traseira.", icon: Camera },
  { tipo: "proximidade", titulo: "Proximidade", descricao: "Teste o sensor quando o navegador oferecer suporte.", icon: MonitorSmartphone },
  { tipo: "multitouch", titulo: "Multi-touch", descricao: "Toque na tela usando vários dedos simultaneamente.", icon: MonitorSmartphone },
  { tipo: "bateria", titulo: "Bateria", descricao: "Confira as informações disponibilizadas pelo navegador.", icon: MonitorSmartphone },
];

function MobileDiagnosticPage() {
  const { token } = Route.useParams();
  const [session, setSession] = useState<{ numero_os: number; tipo: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, TestStatus>>({});
  const [note, setNote] = useState("");
  const [finished, setFinished] = useState(false);
  const [touches, setTouches] = useState<{ x: number; y: number }[]>([]);
  const [maxPointers, setMaxPointers] = useState(0);
  const [screenColor, setScreenColor] = useState("#111111");
  const [cameraError, setCameraError] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [motion, setMotion] = useState("");
  const [battery, setBattery] = useState<{ level?: number; charging?: boolean } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const current = TESTS[index];

  useEffect(() => {
    const db = supabase as any;
    async function load() {
      const { data, error } = await db.rpc("get_diagnostic_session", { p_token: token });
      const entry = Array.isArray(data) ? data[0] : null;
      if (error || !entry) {
        toast.error("Este link de diagnóstico é inválido ou expirou.");
        setLoading(false);
        return;
      }
      setSession(entry);
      const device = {
        user_agent: navigator.userAgent,
        plataforma: navigator.platform,
        resolucao: `${window.screen.width}x${window.screen.height}`,
        orientacao: screen.orientation?.type || "indisponível",
      };
      await db.rpc("connect_diagnostic_session", { p_token: token, p_device_info: device });
      setLoading(false);
    }
    void load();
    return () => stopMedia();
  }, [token]);

  useEffect(() => {
    const browserNavigator = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> };
    browserNavigator.getBattery?.().then((info) => setBattery({ level: info.level, charging: info.charging })).catch(() => undefined);
  }, []);

  function stopMedia() {
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    mediaRef.current = null;
  }

  async function save(status: TestStatus) {
    const technical: Record<string, unknown> = {};
    if (current.tipo === "touch") technical.pontos_tocados = touches.length;
    if (current.tipo === "multitouch") technical.maximo_dedos = maxPointers;
    if (current.tipo === "bateria" && battery) technical.bateria = battery;
    if (current.tipo === "movimento") technical.movimento_detectado = Boolean(motion);

    const { error } = await (supabase as any).rpc("save_diagnostic_test", {
      p_token: token,
      p_tipo: current.tipo,
      p_status: status,
      p_observacao: note || null,
      p_resultado_tecnico: technical,
    });
    if (error) {
      toast.error("Não foi possível salvar este teste.", { description: error.message });
      return;
    }

    stopMedia();
    setResults((previous) => ({ ...previous, [current.tipo]: status }));
    setNote("");
    if (index === TESTS.length - 1) setFinished(true);
    else setIndex((value) => value + 1);
  }

  async function startCamera(facingMode: "user" | "environment") {
    try {
      stopMedia();
      setCameraError("");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      mediaRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
    }
  }

  async function recordAudio() {
    try {
      if (recording && recorderRef.current) {
        recorderRef.current.stop();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = stream;
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        setAudioUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })));
        setRecording(false);
        stopMedia();
      };
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  }

  function playTone() {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return toast.error("Áudio não suportado neste navegador.");
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    oscillator.frequency.value = 880;
    oscillator.connect(audio.destination);
    oscillator.start();
    setTimeout(() => { oscillator.stop(); void audio.close(); }, 900);
  }

  async function testMotion() {
    try {
      const DeviceOrientation = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
      if (DeviceOrientation.requestPermission && await DeviceOrientation.requestPermission() !== "granted") throw new Error("denied");
      const listener = (event: DeviceOrientationEvent) => setMotion(`Inclinação: ${Math.round(event.beta || 0)}° / ${Math.round(event.gamma || 0)}°`);
      window.addEventListener("deviceorientation", listener, { once: true });
      setTimeout(() => window.removeEventListener("deviceorientation", listener), 8000);
      setMotion("Mova o aparelho agora…");
    } catch {
      toast.error("Sensor de movimento não disponível ou sem permissão.");
    }
  }

  async function testFlash() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      mediaRef.current = stream;
      const track = stream.getVideoTracks()[0] as MediaStreamTrack & { applyConstraints: (constraints: MediaTrackConstraints) => Promise<void> };
      await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
      toast.success("Solicitação de flash enviada. Observe o aparelho.");
    } catch {
      toast.error("Flash não disponível neste dispositivo ou navegador.");
    }
  }

  function trackTouch(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setTouches((value) => [...value, { x: Math.round(event.clientX - bounds.left), y: Math.round(event.clientY - bounds.top) }].slice(-160));
    const coalesced = event.nativeEvent.getCoalescedEvents?.().length ?? 1;
    setMaxPointers((value) => Math.max(value, coalesced));
  }

  async function complete() {
    const { error } = await (supabase as any).rpc("finish_diagnostic_session", { p_token: token });
    if (error) return toast.error("Não foi possível finalizar o diagnóstico.");
    toast.success("Diagnóstico salvo na Ordem de Serviço.");
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-white">Conectando ao diagnóstico…</main>;
  if (!session) return <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-center text-white"><WifiOff className="mb-3 size-10 text-red-400" /><p>Link inválido, cancelado ou expirado.</p></main>;

  if (finished) {
    const values = Object.values(results);
    const approved = values.filter((value) => value === "aprovado").length;
    const problems = values.filter((value) => value === "problema").length;
    return (
      <main className="min-h-screen bg-zinc-950 p-5 text-white">
        <div className="mx-auto max-w-md pt-8">
          <Badge className="bg-blue-600">BRIKS</Badge>
          <h1 className="mt-5 text-3xl font-bold">Diagnóstico concluído</h1>
          <p className="mt-2 text-zinc-400">OS #{session.numero_os} · Resultado salvo automaticamente.</p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Summary label="Aprovados" value={approved} tone="text-emerald-400" />
            <Summary label="Problemas" value={problems} tone="text-red-400" />
            <Summary label="Indisponíveis" value={values.filter((v) => v === "indisponivel").length} tone="text-amber-400" />
          </div>
          <div className="mt-6 space-y-2 rounded-2xl bg-zinc-900 p-4">
            {TESTS.filter((item) => results[item.tipo]).map((item) => <p key={item.tipo} className="flex justify-between text-sm"><span>{item.titulo}</span><StatusBadge status={results[item.tipo]} /></p>)}
          </div>
          <Button className="mt-6 w-full bg-blue-600 hover:bg-blue-500" onClick={complete}>Finalizar e voltar ao técnico</Button>
        </div>
      </main>
    );
  }

  const Icon = current.icon;
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-md px-5 pb-8 pt-5">
        <div className="flex items-center justify-between"><span className="font-bold tracking-widest text-blue-400">BRIKS</span><span className="text-xs text-zinc-400">OS #{session.numero_os}</span></div>
        <h1 className="mt-5 text-2xl font-bold">Diagnóstico do celular</h1>
        <div className="mt-5"><div className="mb-2 flex justify-between text-xs text-zinc-400"><span>TESTE {index + 1} DE {TESTS.length}</span><span>{Math.round(((index + 1) / TESTS.length) * 100)}%</span></div><Progress value={((index + 1) / TESTS.length) * 100} /></div>

        <section className="mt-6 rounded-2xl bg-zinc-900 p-5 shadow-xl">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-600"><Icon className="size-5" /></div>
          <h2 className="mt-4 text-xl font-semibold">{current.titulo}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{current.descricao}</p>
          <TestInterface tipo={current.tipo} screenColor={screenColor} setScreenColor={setScreenColor} touches={touches} onTouch={trackTouch} maxPointers={maxPointers} videoRef={videoRef} cameraError={cameraError} startCamera={startCamera} recording={recording} audioUrl={audioUrl} recordAudio={recordAudio} playTone={playTone} testMotion={testMotion} motion={motion} testFlash={testFlash} battery={battery} />
          <Textarea className="mt-5 min-h-20 border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Observação opcional…" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button className="h-12 bg-emerald-600 hover:bg-emerald-500" onClick={() => void save("aprovado")}><Check />Aprovado</Button>
            <Button className="h-12 bg-red-600 hover:bg-red-500" onClick={() => void save("problema")}><X />Problema</Button>
          </div>
          <Button variant="ghost" className="mt-2 w-full text-amber-400 hover:bg-amber-400/10 hover:text-amber-300" onClick={() => void save("indisponivel")}>Não disponível neste dispositivo</Button>
        </section>
        {index > 0 && <Button variant="ghost" className="mt-3 text-zinc-400" onClick={() => setIndex((value) => value - 1)}><ChevronLeft />Voltar</Button>}
      </div>
    </main>
  );
}

function TestInterface(props: any) {
  const { tipo } = props;
  if (tipo === "tela" || tipo === "cores") {
    const colors = ["#000000", "#ffffff", "#ef4444", "#22c55e", "#3b82f6", "#eab308"];
    return <div className="mt-5"><div className="h-44 rounded-xl border border-zinc-700" style={{ background: props.screenColor }} /><div className="mt-3 grid grid-cols-6 gap-2">{colors.map((color) => <button aria-label={color} key={color} onClick={() => props.setScreenColor(color)} className="size-9 rounded-full border border-zinc-600" style={{ background: color }} />)}</div></div>;
  }
  if (tipo === "touch" || tipo === "multitouch") {
    return <div className="mt-5"><div onPointerDown={props.onTouch} onPointerMove={props.onTouch} className="relative h-48 touch-none overflow-hidden rounded-xl border-2 border-dashed border-blue-500/60 bg-blue-500/5">{props.touches.map((point: {x:number;y:number}, i:number) => <span key={i} className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400" style={{ left: point.x, top: point.y }} />)}<p className="p-4 text-center text-sm text-zinc-400">{tipo === "multitouch" ? `Dedos/pontos detectados: ${Math.max(props.maxPointers, props.touches.length ? 1 : 0)}` : "Passe o dedo por toda a área"}</p></div></div>;
  }
  if (tipo === "camera_traseira" || tipo === "camera_frontal") return <div className="mt-5"><div className="overflow-hidden rounded-xl bg-black"><video className="aspect-video w-full" ref={props.videoRef} playsInline muted /></div><Button className="mt-3 w-full" variant="secondary" onClick={() => void props.startCamera(tipo === "camera_frontal" ? "user" : "environment")}><Camera />Abrir câmera</Button>{props.cameraError && <p className="mt-2 text-xs text-red-400">{props.cameraError}</p>}</div>;
  if (tipo === "microfone") return <div className="mt-5"><Button className="w-full" variant="secondary" onClick={() => void props.recordAudio()}><Mic />{props.recording ? "Parar gravação" : "Iniciar teste"}</Button>{props.audioUrl && <audio className="mt-3 w-full" src={props.audioUrl} controls />}</div>;
  if (tipo === "alto_falante") return <Button className="mt-5 w-full" variant="secondary" onClick={props.playTone}><Speaker />Reproduzir som</Button>;
  if (tipo === "vibracao") return <Button className="mt-5 w-full" variant="secondary" onClick={() => navigator.vibrate ? navigator.vibrate([180, 100, 180]) : toast.error("Vibration API não suportada.")}><Vibrate />Testar vibração</Button>;
  if (tipo === "movimento") return <div className="mt-5"><Button className="w-full" variant="secondary" onClick={() => void props.testMotion()}><RotateCcw />Testar movimento</Button>{props.motion && <p className="mt-3 rounded-lg bg-zinc-800 p-3 text-center text-sm text-blue-300">{props.motion}</p>}</div>;
  if (tipo === "flash") return <Button className="mt-5 w-full" variant="secondary" onClick={() => void props.testFlash()}><Camera />Testar flash</Button>;
  if (tipo === "proximidade") return <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">Sensor de proximidade normalmente não é exposto por navegadores móveis. Use “Não disponível” se não houver suporte.</p>;
  if (tipo === "bateria") return props.battery ? <div className="mt-5 rounded-lg bg-zinc-800 p-4 text-sm"><p>Bateria: {Math.round(props.battery.level * 100)}%</p><p className="mt-1 text-zinc-400">{props.battery.charging ? "Carregando" : "Não carregando"}</p></div> : <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">Informações de bateria não disponíveis neste navegador.</p>;
  return null;
}

function StatusBadge({ status }: { status: TestStatus }) {
  const map = { aprovado: ["Aprovado", "bg-emerald-500/15 text-emerald-400"], problema: ["Problema", "bg-red-500/15 text-red-400"], indisponivel: ["Não disponível", "bg-amber-500/15 text-amber-400"] } as const;
  return <Badge className={map[status][1]}>{map[status][0]}</Badge>;
}
function Summary({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="rounded-xl bg-zinc-900 p-3 text-center"><p className={`text-2xl font-bold ${tone}`}>{value}</p><p className="mt-1 text-[11px] text-zinc-400">{label}</p></div>; }
