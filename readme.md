# Sobrecarga

Sobrecarga e um app PWA para organizacao psicologica e acompanhamento pessoal em periodos de sobrecarga emocional, profissional ou familiar.

O objetivo nao e produtividade e nem gestao de tarefas.
O objetivo e dar clareza para o usuario revisar como esta, o que mudou e qual passo concreto merece atencao.

---

## O que ja esta implementado

### Tela 1: Login

- Login com e-mail e senha.
- Integracao com Firebase Authentication.
- Tela responsiva com estado de carregamento e erro.

### Tela 2: Menu principal

O menu principal ja renderiza 11 cards:

1. Resumo simples a esquerda e radar chart a direita.
2. Variaveis cardinais com botoes `-` e `+` e valor central entre `49` e `99`.
3. Card da variavel base ligada a cardinal `Identidade`.
4. Card da variavel base ligada a cardinal `Saude Mental`.
5. Card da variavel base ligada a cardinal `Saude Fisica`.
6. Card da variavel base ligada a cardinal `Familia`.
7. Card da variavel base ligada a cardinal `Profissional`.
8. Pergunta semanal com escala de `-3` a `+3`.
9. Pergunta do proximo passo concreto com modal de busca das folhas.
10. Card oculto com botao `...` para mostrar folhas alteradas e historico de valores.
11. Grafico com o progresso medio das variaveis cardinais.

### PWA

- `manifest.json`
- `sw.js`
- icones SVG
- registro automatico do service worker no navegador

### Persistencia local

- O estado da sessao e salvo por usuario no `localStorage`.
- O app lembra:
  - valores das cardinais
  - valores das folhas
  - pergunta semanal
  - proximo passo concreto
  - abertura do card oculto

### Persistencia remota

- O envio para o Firestore e automatico e continuo.
- O app sincroniza ao abrir, ao retomar foco, ao voltar da suspensao e depois das alteracoes locais.
- O botao `Salvar` continua como atalho opcional para forcar a sincronizacao.
- O workspace leva metadados de revisao para ajudar a resolver conflitos entre dispositivos.
- O `localStorage` e salvo automaticamente a cada alteracao.
- O primeiro conjunto de cardinais e folhas aparece localmente como seed do prototipo.

---

## Dados ja cadastrados no prototipo

### Variaveis cardinais

O prototipo ja vem com 5 cardinais:

- Identidade
- Saude Mental
- Saude Fisica
- Familia
- Profissional

### Estrutura da arvore

- Nivel 1: cards tronco
  - Identidade
  - Saude Mental
  - Saude Fisica
  - Familia
  - Profissional
- Nivel 2: cards internos dentro de cada tronco
- Nivel 3: folhas com valor e prazo

Alterar uma folha altera automaticamente a media do tronco.
Alterar o tronco redistribui a mudanca entre as folhas daquele tronco.

### Variaveis base

O prototipo ja vem com 14 folhas de exemplo, entre elas:

- Sono consistente
- Meditacao curta
- Sessao de terapia
- Caminhada diaria
- Hidratacao
- Alimentacao simples
- Tempo com meu filho
- Conversa de alinhamento
- Rotina da casa
- Foco profundo
- Priorizacao da semana
- Aprendizado direcionado
- Autoconhecimento
- Valores pessoais

### Regras das folhas

- Valor entre `49` e `99`
- Prazo ou horizonte temporal
- Observacao
- Relacao com cardinal
- Progresso calculado no card 10 e card 11
- Revisao semanal com status bar de `-3` a `+3`

---

## Como iniciar o app

Use o servidor local incluido no projeto:

```bash
npm run dev
```

Depois abra:

```text
http://127.0.0.1:4173
```

Importante:

- Abra o app pela raiz do repositorio, usando `index.html`.
- Nao use mais `src/index.html`, porque ele foi removido.
- Os arquivos do PWA tambem vivem na raiz:
  - `manifest.json`
  - `sw.js`

---

## Provisionar usuario de acesso

Nao existe tela de criar conta. O usuario pode ser criado pelo backend usando o script de provisionamento.

### Script

```bash
npm run provision:user
```

### Variaveis necessarias

- `FIREBASE_EMAIL`
- `FIREBASE_PASSWORD`
- opcional: `FIREBASE_DISPLAY_NAME`

### Exemplo

```powershell
$env:FIREBASE_EMAIL="mail@mail.com"
$env:FIREBASE_PASSWORD="123456789"
npm run provision:user
```

### Importante

Se o Firebase retornar `CONFIGURATION_NOT_FOUND`, normalmente significa que o provedor `Email/Password` ainda nao esta habilitado no projeto.
Nesse caso:

1. Abra o Firebase Console.
2. Va em `Authentication`.
3. Ative o provedor `Email/Password`.
4. Salve.
5. Rode o script novamente.

---

## Guia rapido

### 1. Rodar localmente

1. Abra o terminal na raiz do projeto.
2. Execute `npm run dev`.
3. Acesse `http://127.0.0.1:4173`.

### 2. Entrar no app

1. Use um usuario com Authentication por e-mail e senha habilitado no Firebase.
2. Faca login na tela inicial.
3. O menu principal carrega com os dados de prototipo ja definidos.

### 3. Validar o prototipo

1. Ajuste uma cardinal no card 2.
2. Abra a pergunta semanal no card 8.
3. Use o card 9 para procurar uma folha.
4. Abra o card 10 pelo botao `...`.
5. Observe o card 11 com o grafico de progresso.

### 4. Subir para o Firestore

1. Faça as alterações desejadas.
2. Confirme que o estado foi salvo localmente.
3. Clique em `Salvar` no topo do menu principal.
4. Aguarde a confirmacao de envio para o Firestore.

---

## Estrutura atual

```text
sobrecarga/
├── index.html
├── manifest.json
├── sw.js
├── package.json
├── scripts/
│   └── dev-server.mjs
├── icons/
│   ├── icon-192.svg
│   └── icon-512.svg
├── src/
│   ├── css/
│   │   ├── variables.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   └── app.css
│   └── js/
│       ├── app.js
│       ├── firebase/
│       │   └── firebase.js
│       ├── models/
│       │   ├── BaseVariable.js
│       │   ├── CardinalVariable.js
│       │   └── WeeklyReview.js
│       ├── services/
│       │   ├── adviceService.js
│       │   ├── moodService.js
│       │   ├── reviewService.js
│       │   └── variableService.js
│       ├── ui/
│       │   ├── adviceModal.js
│       │   ├── dashboard.js
│       │   ├── moodPanel.js
│       │   └── radarChart.js
│       └── utils/
│           ├── calculations.js
│           └── dates.js
├── firebase.json
└── readme.md
```

---

## Configuracao do Firebase

Hoje a configuracao do Firebase fica centralizada em `src/js/firebase/firebaseConfig.js`.

Isso evita divergencias entre `localhost`, GitHub Pages e scripts locais, porque a mesma origem de verdade alimenta o app e os utilitarios do projeto.

### O que precisa existir no Firebase

- Authentication com login por e-mail e senha habilitado
- Projeto Firebase ativo
- Usuario cadastrado para teste

### Atencao

Se o login falhar, normalmente o problema e um destes:

- e-mail ou senha invalidos
- Authentication nao habilitado
- usuario ainda nao criado no Firebase Console

---

## O que ainda falta fazer

### Prioridade alta

- Ligar as cardinais e folhas ao Firestore.
- Substituir o estado em `localStorage` por dados reais do banco.
- Criar cadastro e edicao real de folhas.
- Criar cadastro e edicao real de cardinais.

### Prioridade media

- Salvar historico temporal.
- Registrar progresso por sessao.
- Persistir a pergunta semanal e o proximo passo concreto no Firestore.
- Melhorar a busca do modal de folhas com filtros mais uteis.

### Prioridade futura

- Multiplos perfis.
- Backup e exportacao.
- Historico grafico completo.
- Conselhos automaticos da vez.

---

## Observacoes importantes

- O app ja esta com foco em mobile e desktop.
- O card 10 fica oculto e e aberto pelo botao `...`.
- O radar chart e desenhado em SVG, sem dependencia externa.
- O projeto esta estruturado como PWA, mas ainda esta no estagio de prototipo funcional.

---

## Checklist para continuar o projeto

### Antes de mexer em dados reais

- Confirmar que o login do Firebase esta funcionando.
- Criar ao menos um usuario de teste.
- Validar se o `localStorage` atual atende o fluxo de prototipo.

### Antes de conectar o Firestore

- Definir o formato das colecoes.
- Definir como ficam cardinais, folhas e revisoes semanais.
- Decidir se a alteracao em cardinais vai refletir automaticamente nas folhas.

### Antes de publicar

- Confirmar que o `index.html` da raiz e o ponto de entrada.
- Confirmar que `manifest.json` e `sw.js` tambem estao na raiz.
- Validar se o deploy escolhido vai servir arquivos staticos a partir da raiz.

---

## Comando util

```bash
npm run dev
```

Se voce quiser, o proximo passo pode ser:

1. conectar o Firestore de verdade,
2. criar telas de cadastro das folhas,
3. ou organizar o app para deploy no GitHub Pages ou Firebase Hosting.
