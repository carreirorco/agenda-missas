# Prompt para colar no Claude Code

Abra o Claude Code dentro de uma pasta nova (ex.: `agenda-missas`), copie o conteúdo desta pasta do kit para lá e cole o texto abaixo.

---

Crie o projeto **Agenda de Missas – Paróquia São Judas Tadeu**, um site estático para hospedar no GitHub Pages (sem build, sem servidor, sem dependências).

## Contexto
Já existe uma página de uma única tela, em `referencia/pagina-atual-novembro.html`, com os dados de novembro de 2026 escritos dentro do código. Ela funciona bem, mas só conhece um mês. `referencia/pagina-anterior-outubro.html` é a versão de outubro. `referencia/quadro-novembro-2026.jpg` é a foto do quadro de avisos da paróquia, de onde os dados são transcritos todo mês.

Os dados já foram extraídos para `data/`:
- `data/config.json`: comunidades (`locais`, com `ext:1` para as de fora da paróquia), padres (`padres`, com cor clara `l` e escura `d`) e tipos de celebração.
- `data/meses.json`: lista dos meses disponíveis (`["2026-10","2026-11"]`).
- `data/AAAA-MM.json`: `destaques` (datas especiais) e `dias`, onde cada dia tem celebrações no formato `[horário, local, tipo, padre, observação]`.

## O que construir
1. `index.html`, `style.css` e `app.js` separados, reaproveitando o visual e o comportamento da página atual (agenda, calendário, comunidades, padres, filtros, botão Copiar, próxima celebração com contagem regressiva).
2. A página lê os JSON com `fetch` e escolhe sozinha o mês de hoje; se não existir arquivo para o mês de hoje, abre o mais recente e avisa "A agenda de <mês> ainda não foi publicada".
3. Seletor de mês (anterior/próximo) no topo, com o mês na URL (`#2026-11`).
4. O "Hoje", a "Próxima celebração" e a contagem regressiva usam a data do aparelho e se atualizam sozinhos, inclusive com a página aberta na virada do dia.
5. Calendário e a faixa de dias dos padres calculados para o mês real (número de dias e dia da semana do dia 1), sem valores fixos.
6. Filtros e listas mostram só padres, comunidades e tipos que aparecem no mês aberto.
7. As cores dos padres vêm de `config.json`, aplicadas como variáveis CSS nos temas claro e escuro. Um padre novo não exige mexer no CSS.
8. Botão de tema claro/escuro fixo no canto superior direito, com localStorage e **tema claro como padrão**.
9. Layout pensado para celular primeiro, sem rolagem horizontal, respeitando safe-area.
10. `README.md` curto explicando: como ativar o GitHub Pages (Settings → Pages → branch `main`), como testar localmente (`python3 -m http.server`) e como adicionar um mês novo (criar `data/AAAA-MM.json` e incluir o mês em `meses.json`).

## Regras
- Português do Brasil em todos os textos.
- Sem frameworks e sem CDN, exceto a fonte do Google Fonts que a página atual já usa.
- Não alterar os dados dos JSON sem me avisar.
- Ao final, rode um servidor local, abra a página e confira: mês de hoje, troca de mês, filtros, tema, calendário de novembro começando no domingo e outubro começando na quinta.
- Depois me pergunte se quero criar o repositório no GitHub e publicar.

## Fluxo mensal (para eu repetir depois)
Quando eu enviar a foto do quadro do mês seguinte, transcreva para `data/AAAA-MM.json` no mesmo formato, atualize `meses.json` e confira o total de celebrações por dia contra a foto.
