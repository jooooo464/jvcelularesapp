# Plano: Tela inteira no celular para os testes de diagnóstico

## Objetivo
Fazer com que a página de diagnóstico acessada pelo QR Code (`/diagnostico/$token`) ocupe toda a tela do celular, sem barras de rolagem verticais, sem margens laterais e com áreas de teste grandes o suficiente para uso real em aparelhos móveis.

## Alterações propostas

### 1. Layout em tela cheia
- Em `src/routes/diagnostico.$token.tsx`, substituir o container `max-w-md` por layout que ocupe `100vw` e `100dvh` em telas pequenas (`sm:` mantém limite apenas em desktop, se desejado).
- Usar `h-dvh`, `flex flex-col` e `flex-1` para que a área do teste preencha o espaço restante abaixo do cabeçalho.
- Remover paddings laterais excessivos no mobile (`px-5`), mantendo apenas segurança mínima (`px-3` ou `px-4`).

### 2. Áreas de teste ampliadas
- **Tela / Cores**: expandir o bloco de cor para ocupar a maior parte da tela (`flex-1` ou `min-h-[50vh]`).
- **Touch / Multitouch**: aumentar a área sensível ao toque para quase toda a largura/altura disponível.
- **Câmera**: vídeo em modo tela cheia (`object-cover`, `h-full`).
- **Botões de ação**: colocar na base da tela, em grade de 2 colunas, com altura confortável (`h-14`/`h-16`).

### 3. Suporte a orientação e safe areas
- Adicionar classes de safe area (`env(safe-area-inset-*)`) para iPhones com notch/Dynamic Island.
- Garantir que o conteúdo não fique escondido sob a barra de navegador do sistema.

### 4. PWA / standalone
- Verificar se o manifesto e meta tags permitem abrir como app standalone ao escanear o QR Code; se necessário, adicionar `apple-mobile-web-app-capable` e ajustar `theme-color` para combinar com o fundo escuro da página de diagnóstico.

### 5. Testes de regressão
- Validar visualmente no preview em viewport mobile (360x760 e 390x844).
- Confirmar que o build continua limpo (`/tmp/observability/build-errors.log`).
- Verificar se nenhum teste quebra (touch, câmera, microfone, vibração, flash) após a mudança de layout.
