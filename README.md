## Local development

Use Node.js 22.12+ (22.x), 24.x, or 26+ to match the test tooling's supported versions.
From the project root:

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Vite reloads the page when you edit `frontend/src/`.
The starter page uses shared event types and does not require AWS or a backend.
Authentication and API integration are not connected yet.

```sh
npm run typecheck
npm test
npm run build
npm run preview --workspace frontend
```

The frontend production output is `frontend/dist/`. The preview command serves
that build locally; it does not deploy to AWS.

## Project structure

Each top-level folder has ONE job. Code you write goes inside each folder's `src/`
(short for "source"). Files next to `src/` (like `package.json`) are settings.

```
surpriseme/
├── package.json          # Root "main": install, build, test commands for everything
├── tsconfig.base.json    # TypeScript settings shared by all folders
├── .gitignore            # Files Git must never save (.env, node_modules, dist)
├── .env.example          # Fake example settings. Copy to .env locally. Never commit .env
├── README.md             # You are here
│
├── shared/               # THE CONTRACT: used by both frontend and backend
│   └── src/
│       ├── constants.ts  # Event types, limits (max photo size, message length)
│       ├── types.ts      # Shape of our data: Surprise, Message, GiftCard, Invite
│       ├── validation.ts # Input rules (zod). Backend checks every request with these
│       └── index.ts      # Exports everything above in one place
│
├── backend/              # SERVER LOGIC (AWS Lambda)
│   └── src/
│       ├── functions/    # Endpoints. One folder per feature, one file per endpoint
│       │   ├── surprises/    # create, list, get, update, delete a surprise
│       │   ├── messages/     # add a message
│       │   ├── invites/      # create a contributor invite link
│       │   ├── media/        # get a temporary upload link for photos
│       │   ├── gift-cards/   # add / remove an already-purchased gift card
│       │   ├── open/         # public recipient view (time-gated)
│       │   └── delivery/     # runs at the scheduled time, sends notifications
│       ├── database/     # The ONLY code that reads/writes DynamoDB
│       ├── services/     # Talks to outside services: email (SES), SMS (SNS),
│       │                 # scheduler (EventBridge), S3 links, encryption (KMS)
│       └── utils/        # Small helpers: logger, errors, tokens, time-gate, auth
│
├── frontend/             # WHAT USERS SEE (React + Vite)
│   └── src/
│       ├── pages/        # One file per screen (login, dashboard, create, open...)
│       ├── components/   # Reusable pieces (button, photo uploader, countdown)
│       ├── templates/    # One folder per event type (birthday, anniversary...)
│       ├── api/          # All calls to the backend live here, nowhere else
│       ├── hooks/        # Reusable screen logic (use-auth, use-surprise)
│       └── styles/       # theme.css: colors, fonts, spacing
│
├── infrastructure/       # AWS SETUP AS CODE (CDK)
│   ├── bin/app.ts        # Entry point: starts the deployment
│   ├── cdk.json          # Tells CDK how to run the app
│   └── stacks/           # One file per group of AWS resources
│                         # (database, storage, auth, api, website, scheduler)
│
├── scripts/              # Helper scripts: smoke test, demo data
├── docs/                 # aws-services.md, API list, architecture diagram
└── .github/workflows/    # Automatic tests and deployment

```
