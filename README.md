# Compartilhar Tela

Site estático para transmitir a tela em até 1080p/1440p a 60 fps, com o áudio do PC, direto do seu navegador para quem tiver o link. Sem login e sem servidor próprio.

**Usar:** https://brunnoaires.github.io/compartilhar-tela/

## Como funciona
- Quem compartilha abre o site, escolhe a qualidade e clica em **Começar a compartilhar**.
- O site gera um link com um código aleatório de 128 bits. Só quem tem o link consegue entrar.
- O vídeo vai direto do seu PC para cada pessoa via WebRTC (ponto a ponto). O servidor público do PeerJS é usado só para as duas pontas se encontrarem.

## Áudio do PC
No Chrome ou Edge (Windows), escolha **Tela inteira** e marque **Compartilhar áudio do sistema**. Em abas, marque **Compartilhar áudio da aba**. No macOS, só o áudio de abas.

Se o Windows recusar o áudio (`Could not start audio source`), o site tenta sozinho o modo **Som do PC, menos o do navegador** (`restrictOwnAudio`), que usa outro caminho de captura, e lembra a escolha. Nesse modo o som tocado no próprio navegador pode ficar de fora; para ele, compartilhe a aba. A página `teste.html` diagnostica o áudio.

## Dicas
- Cada pessoa assistindo consome a taxa escolhida no seu upload (ex.: 12 Mbps × 3 pessoas = 36 Mbps).
- Se o PC sofrer para codificar 1080p60, troque o codec para **H.264**.
- Quem assiste pode ver resolução, fps e taxa real em **Estatísticas**.
- `?srv=host:porta` aponta para outro servidor PeerJS (ex.: um servidor próprio).

## Desenvolvimento
O site é feito com Vite e JavaScript puro.

- `npm install` e depois `npm run dev` para rodar localmente.
- `npm run build` gera os arquivos estáticos em `dist/`.
- O workflow `.github/workflows/deploy.yml` publica no GitHub Pages a cada push na `main`. Em **Settings → Pages**, escolha **GitHub Actions** como fonte.
- `public/teste.html` é copiado sem mudanças para o site publicado.
