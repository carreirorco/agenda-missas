# Agenda de Missas · Paróquia São Judas Tadeu

Site estático (sem build, sem servidor, sem dependências) com a agenda mensal de missas e sacramentos. O visual segue a identidade do Sistema de Consagração (azul-marinho, dourado, títulos em Cormorant Garamond).

## Publicar no GitHub Pages

1. Envie esta pasta para um repositório no GitHub (branch `main`).
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
4. Em alguns minutos o site fica em `https://<usuario>.github.io/<repositorio>/`.

## Testar localmente

```bash
python3 -m http.server
```

Abra `http://localhost:8000`. (Abrir o `index.html` direto do disco não funciona, pois a página lê os JSON com `fetch`.)

## Adicionar um mês novo

1. Crie `data/AAAA-MM.json` no mesmo formato dos existentes (`destaques` e `dias`, com celebrações `[horário, local, tipo, padre, observação]`).
2. Inclua o mês em `data/meses.json` (ex.: `["2026-10","2026-11","2026-12"]`).
3. Se surgir comunidade, padre ou tipo novo, cadastre em `data/config.json`. Padre novo leva cor clara (`l`) e escura (`d`); não precisa mexer no CSS.

A página abre sozinha no mês de hoje. Se esse mês ainda não existir, abre o mais recente e avisa que a agenda ainda não foi publicada. O mês também vai na URL (`#2026-11`).

## Arquivos

- `index.html`, `style.css`, `app.js`: a página.
- `data/`: configuração e meses.
- `referencia/`: páginas antigas e a foto do quadro (apoio para a transcrição; não são usadas pelo site).
