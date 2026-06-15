# Sobrecarga

Aplicação web voltada para organização psicológica e acompanhamento pessoal durante períodos de sobrecarga emocional, profissional ou familiar.

O objetivo do projeto não é aumentar produtividade ou gerenciar tarefas.

O objetivo é fornecer clareza mental através da revisão periódica de áreas importantes da vida.

---

# Filosofia

A vida é composta por áreas principais (troncos) e elementos específicos (folhas).

Ao longo do tempo, o usuário revisa esses elementos, ajustando sua percepção sobre cada aspecto da própria vida.

O sistema incentiva reflexão, consciência e pequenos passos concretos.

---

# Tecnologias

## Front-end

* HTML
* CSS
* JavaScript
* PWA

## Backend

* Firebase

## Banco de Dados

* Firestore

## Hospedagem

* GitHub Pages

---

# Estrutura Conceitual

## Variáveis Cardinais

Representam grandes áreas da vida.

Exemplos:

* Identidade
* Saúde Mental
* Saúde Física
* Família
* Profissional

As variáveis cardinais são calculadas através das variáveis base associadas.

---

## Variáveis Base

Representam aspectos específicos da vida.

Exemplos:

* Sono
* Exercícios
* Tempo com o filho
* Finanças

Características:

* Valor entre 49 e 99.
* Prazo associado.
* Observações.
* Folhas irmãs.
* Arquivamento.

---

# Escala

| Valor | Significado         |
| ----- | ------------------- |
| 49    | Estado crítico      |
| 50-59 | Grande insatisfação |
| 60-69 | Necessita atenção   |
| 70-79 | Aceitável           |
| 80-89 | Saudável            |
| 90-99 | Excelente           |

---

# Horizontes Temporais

Toda variável base possui um horizonte temporal.

* 30 dias
* 90 dias
* 1 ano
* 5 anos

O horizonte representa o contexto original da criação da variável.

Não gera alertas ou punições.

Seu objetivo é apenas preservar contexto histórico.

---

# Fluxo Semanal

1. Revisar estado emocional.
2. Revisar passo concreto da semana anterior.
3. Ler conselho da vez.
4. Atualizar variáveis.
5. Definir próximo passo concreto.
6. Salvar progresso.

---

# Conselho da Vez

O sistema identifica variáveis pouco revisitadas.

Existem dois tipos:

## Conselho de Atenção

Variável esquecida com valor baixo.

Objetivo:

Trazer novamente o assunto para reflexão.

---

## Conselho de Reconhecimento

Variável esquecida com valor alto.

Objetivo:

Reconhecer conquistas e estabilidade.

---

# Estrutura de Pastas

```text
sobrecarga/

├── public/
│   ├── icons/
│   ├── manifest.json
│   └── sw.js
│
├── src/
│
│   ├── assets/
│   │   ├── images/
│   │   └── emojis/
│   │
│   ├── css/
│   │   ├── variables.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   └── app.css
│   │
│   ├── js/
│   │
│   │   ├── app.js
│   │   ├── router.js
│   │   │
│   │   ├── firebase/
│   │   │   └── firebase.js
│   │   │
│   │   ├── models/
│   │   │   ├── CardinalVariable.js
│   │   │   ├── BaseVariable.js
│   │   │   └── WeeklyReview.js
│   │   │
│   │   ├── services/
│   │   │   ├── moodService.js
│   │   │   ├── adviceService.js
│   │   │   ├── reviewService.js
│   │   │   └── variableService.js
│   │   │
│   │   ├── ui/
│   │   │   ├── dashboard.js
│   │   │   ├── radarChart.js
│   │   │   ├── moodPanel.js
│   │   │   └── adviceModal.js
│   │   │
│   │   └── utils/
│   │       ├── calculations.js
│   │       └── dates.js
│
│   └── index.html
│
├── .env.example
├── .gitignore
├── README.md
└── firebase.json
```

---

# Configuração do Ambiente

Criar um arquivo:

```text
.env
```

Baseado em:

```text
.env.example
```

Exemplo:

```env
FIREBASE_API_KEY=xxxxxxxxxxxxxxxx
FIREBASE_AUTH_DOMAIN=xxxxxxxxxxxxxxxx
FIREBASE_PROJECT_ID=xxxxxxxxxxxxxxxx
FIREBASE_STORAGE_BUCKET=xxxxxxxxxxxxxxxx
FIREBASE_MESSAGING_SENDER_ID=xxxxxxxxxxxxxxxx
FIREBASE_APP_ID=xxxxxxxxxxxxxxxx
```

---

# .env.example

```env
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```

---

# Git Ignore

```gitignore
.env

node_modules/

dist/

firebase-debug.log

.DS_Store
```

---

# Roadmap MVP

## MVP 1

* Cadastro de variáveis cardinais.
* Cadastro de variáveis base.
* Radar Chart.
* Estado emocional.
* Conselho da vez.
* Revisão semanal.
* Próximo passo concreto.

## MVP 2

* Histórico temporal.
* Evolução gráfica.
* Estatísticas pessoais.

## MVP 3

* Exportação de dados.
* Backup local.
* Múltiplos perfis.
* IA para geração de reflexões.

```
```
