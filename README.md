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

Antes de publicar, rode `python3 scripts/validar.py`: ele confere horários, comunidades, padres e tipos contra o `config.json` (o GitHub também roda essa checagem a cada push em `data/`).

A página abre sozinha no mês de hoje. Se esse mês ainda não existir, abre o mais recente e avisa que a agenda ainda não foi publicada. O mês também vai na URL (`#2026-11`).

## Localização das comunidades e "Adicionar à agenda"

Cada comunidade em `data/config.json` pode ter, além de `n` (nome): `cidade` (ex.: `"Pederneiras/SP"`), `end` (rua e número) e `geo` (`"lat,lon"` do ponto exato; no Google Maps, clique com o botão direito no local e copie as coordenadas). Tudo é opcional: sem `geo`, o mapa e a agenda usam o nome, o endereço e a cidade.

Em cada missa há um botão discreto com ícone de calendário. Ele abre um quadro com **Google Agenda**, **arquivo .ics** (Samsung, Apple, Outlook) e **Ver no mapa**. O evento leva celebrante, observações e o endereço da comunidade; missa dura 1h e os demais sacramentos 1h30; o `.ics` inclui lembrete 1 hora antes.

## Tutorial do primeiro acesso

Na primeira visita (controlada por `localStorage`, chave `missas-tour`) abre um tutorial em 7 passos que destaca o próximo evento, o mês, os filtros, o botão de agenda e as abas. Nos passos de toque, ele avança sozinho quando a pessoa toca no botão destacado. Dá para pular (ou Esc) e rever pelo link "Ver o tutorial de uso" no fim da página. Para ver como um visitante novo, apague essa chave no navegador.

## Arquivos

- `index.html`, `style.css`, `app.js`: a página.
- `scripts/validar.py` e `.github/workflows/`: validação dos dados.
- `fonts/`: Cormorant Garamond (licença OFL), hospedada aqui para não depender do Google.
- `data/`: configuração e meses.
- `referencia/`: páginas antigas e a foto do quadro (apoio para a transcrição; não são usadas pelo site).
