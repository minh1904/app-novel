import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'

// --- Ranh giới giữa các vùng mã -----------------------------------------------------------------
// Luật chỉ so khớp **chuỗi** trong câu import, nên tên thư mục dùng làm ranh giới (`main`,
// `renderer`, `preload`) phải là duy nhất trong repo. Tệp test được miễn: test dựng bối cảnh nên được
// import chéo vùng (hai test của renderer còn đọc tệp bằng node:fs).
//
// Đây là bản theo bố cục hiện tại. Change `refactor-electron-structure` thay các khối `main` bằng
// bản theo tầng infra < services < ipc < electron ở bước R2.
const TESTS = ['**/*.test.ts', '**/*.test.tsx']
const from = (folder) => '(^|/)' + folder + '/'

/** Một vùng, một danh sách import bị cấm. Mỗi phần tử là [tên gói hoặc regex, thông điệp]. */
function boundary(files, { packages = [], patterns = [] }, ignores = TESTS) {
  return {
    files,
    ignores,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: packages.map(([name, message]) => ({ name, message })),
          patterns: patterns.map(([regex, message]) => ({ regex, message }))
        }
      ]
    }
  }
}

// Chỉ ba tệp của main được import electron. Danh sách này co lại còn `main/electron/` ở bước R2.
const MAIN_ELECTRON_ALLOWED = [
  'src/main/index.ts',
  'src/main/ipc/library.ts',
  'src/main/storage/electronSafeStorage.ts'
]

export default defineConfig(
  // scripts/ holds plain-JS tooling that runs outside the TypeScript projects.
  // Wireframe là script chạy thẳng trong trình duyệt để xem, không phải mã của app.
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/out',
      'scripts',
      '.claude',
      'docs/handbook/experience/wireframes'
    ]
  },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules
    }
  },
  boundary(['src/shared/**/*.ts'], {
    packages: [
      [
        'electron',
        'shared/ chạy ở main, preload và renderer nên không import electron. Mã cần Electron nằm ở src/main.'
      ],
      ['react', 'shared/ không phụ thuộc giao diện. Mã React nằm ở src/renderer.'],
      ['react-dom', 'shared/ không phụ thuộc giao diện. Mã React nằm ở src/renderer.']
    ],
    patterns: [
      [
        '^node:',
        'shared/ cũng chạy trong renderer và preload (sandbox) nên không dùng module Node (node:*).'
      ],
      [from('main'), 'shared/ không được import từ src/main.'],
      [from('renderer'), 'shared/ không được import từ src/renderer.'],
      [from('preload'), 'shared/ không được import từ src/preload.']
    ]
  }),
  boundary(['src/renderer/**/*.{ts,tsx}'], {
    packages: [
      [
        'electron',
        'Renderer chỉ nói chuyện với main qua window.mira (preload). Không import electron.'
      ]
    ],
    patterns: [
      ['^node:', 'Renderer chạy trong trình duyệt sandbox, không có module Node (node:*).'],
      [from('main'), 'Renderer không import từ src/main. Dùng kiểu và hợp đồng trong src/shared.'],
      [from('preload'), 'Renderer không import từ src/preload. Dùng window.mira.']
    ]
  }),
  boundary(['src/preload/**/*.ts'], {
    patterns: [
      [
        '^node:',
        'Preload chạy trong sandbox: chỉ require được electron, không dùng module Node (node:*).'
      ],
      [from('main'), 'Preload không import từ src/main. Chỉ dùng hợp đồng trong src/shared.'],
      [from('renderer'), 'Preload không import từ src/renderer.']
    ]
  }),
  boundary(
    ['src/main/**/*.ts'],
    {
      packages: [
        [
          'electron',
          'Chỉ index.ts, ipc/library.ts và storage/electronSafeStorage.ts được import electron. Mã khác phải chạy được không cần Electron.'
        ]
      ],
      patterns: [[from('renderer'), 'Main không import từ src/renderer.']]
    },
    [...TESTS, ...MAIN_ELECTRON_ALLOWED]
  ),
  boundary(MAIN_ELECTRON_ALLOWED, {
    patterns: [[from('renderer'), 'Main không import từ src/renderer.']]
  }),
  eslintConfigPrettier
)
