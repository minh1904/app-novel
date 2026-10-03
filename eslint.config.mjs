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
// Trong `src/main` có bốn tầng, mỗi tầng chỉ được import tầng dưới nó:
//
//   infra < services < ipc < electron (cùng `index.ts`)
//
// Chỉ `electron/` và `index.ts` được import gói `electron`, nên mọi thứ còn lại chạy được trong Node
// trần (test không cần dựng cửa sổ) và có thể chuyển sang tiến trình khác về sau. Thêm một tầng hay
// một quy tắc là thêm một khối `boundary(...)` ở dưới; xem docs/handbook/engineering/architecture.md.
const TESTS = ['**/*.test.ts', '**/*.test.tsx']
/** Tiến trình con của `crash.test.ts`: không phải test nhưng là công cụ test, nên được miễn luật. */
const NOT_ENFORCED = [...TESTS, '**/crash*.ts']
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

const NO_ELECTRON = [
  'electron',
  'Chỉ index.ts và main/electron/ được import electron. Mã khác phải chạy được không cần Electron.'
]
const NO_RENDERER = [from('renderer'), 'Main không import từ src/renderer.']
const NO_TESTING = [
  from('testing'),
  'main/testing/ là công cụ chỉ dành cho test; mã chạy thật không được import nó.'
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
    ['src/main/infra/**/*.ts'],
    {
      packages: [NO_ELECTRON],
      patterns: [
        [from('services'), 'infra/ là tầng thấp nhất của main: không import từ services/.'],
        [from('ipc'), 'infra/ không import từ ipc/.'],
        [from('electron'), 'infra/ không import từ electron/.'],
        NO_RENDERER,
        NO_TESTING
      ]
    },
    NOT_ENFORCED
  ),
  boundary(
    ['src/main/services/**/*.ts'],
    {
      packages: [NO_ELECTRON],
      patterns: [
        [from('ipc'), 'services/ không import từ ipc/ (ipc gọi services, không ngược lại).'],
        [from('electron'), 'services/ không import từ electron/.'],
        NO_RENDERER,
        NO_TESTING
      ]
    },
    NOT_ENFORCED
  ),
  // Khối sau ghi đè khối trước cho cùng một tệp, nên nhắc lại đủ các luật của services/.
  boundary(
    ['src/main/services/library/**/*.ts'],
    {
      packages: [NO_ELECTRON],
      patterns: [
        [from('ipc'), 'services/ không import từ ipc/ (ipc gọi services, không ngược lại).'],
        [from('electron'), 'services/ không import từ electron/.'],
        [
          from('ai'),
          'services/library không import từ services/ai (dịch chương dùng LibraryStore, không ngược lại).'
        ],
        NO_RENDERER,
        NO_TESTING
      ]
    },
    NOT_ENFORCED
  ),
  boundary(
    ['src/main/ipc/**/*.ts'],
    {
      packages: [NO_ELECTRON],
      patterns: [
        [
          from('electron'),
          'ipc/ không import từ electron/. Giữ handler thuần để test không cần dựng cửa sổ.'
        ],
        NO_RENDERER,
        NO_TESTING
      ]
    },
    NOT_ENFORCED
  ),
  boundary(
    ['src/main/electron/**/*.ts', 'src/main/index.ts'],
    {
      patterns: [NO_RENDERER, NO_TESTING]
    },
    NOT_ENFORCED
  ),
  eslintConfigPrettier
)
