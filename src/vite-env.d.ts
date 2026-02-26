/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AWS_REGION?: string
  readonly VITE_DYNAMODB_ENDPOINT?: string
  readonly VITE_AWS_ACCESS_KEY_ID?: string
  readonly VITE_AWS_SECRET_ACCESS_KEY?: string
  readonly VITE_DYNAMODB_USERS_TABLE?: string
  readonly VITE_DYNAMODB_USER_SETTINGS_TABLE?: string
  readonly VITE_JIRA_API_TOKEN?: string
  readonly VITE_JIRA_DOMAIN?: string
  readonly VITE_JIRA_EMAIL?: string
  readonly VITE_JIRA_PROJECT_KEY?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_GLOBAL_DELIVERY?: string
  readonly VITE_TEAM_FIELD_NAME?: string
  readonly VITE_ID_ALICJA?: string
  readonly VITE_ID_RAKU?: string
  readonly VITE_ID_TOMEK?: string
  readonly VITE_ID_KRZYSIEK?: string
  readonly VITE_ID_OLIWER?: string
  readonly VITE_ROLE_TOMASZ_RUSINSKI?: string
  readonly VITE_ROLE_BARTOSZ_BOSSY?: string
  readonly VITE_ROLE_OLIWER_PAWELSKI?: string
  readonly VITE_ROLE_KRZYSZTOF_RAK?: string
  readonly VITE_ROLE_KRZYSZTOF_ADAMEK?: string
  readonly VITE_ROLE_ALICJA_WOLNIK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}