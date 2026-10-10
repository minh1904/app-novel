import { useEffect, useMemo, useState, type JSX } from 'react'
import { MinimalisticMagnifierIcon } from '@solar-icons/react/linear/minimalistic-magnifier'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { CloseCircleIcon } from '@solar-icons/react/linear/close-circle'
import { PageFrame } from '../../app/PageFrame'
import { Badge } from '../../components/ui/Badge'
import { Button, LinkButton } from '../../components/ui/Button'
import { ButtonGroup } from '../../components/ui/ButtonGroup'
import { CompactButton } from '../../components/ui/CompactButton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ICON } from '../../components/ui/icon'
import { SearchInput } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { TabsList, TabsPanel, TabsRoot, TabsTab } from '../../components/ui/Tabs'
import type { SourceCapability, SourceDescriptor } from '../../../../shared/contracts/sources'
import { SourceCard } from './SourceCard'

export interface SourcesScreenProps {
  onOpenWork?: (workId: string) => void
  onOpenSettings?: () => void
  initialSources?: SourceDescriptor[]
}

type CountryFacet = 'all' | 'CN' | 'JP' | 'KR' | 'other'

const COUNTRY_OPTIONS: { id: CountryFacet; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'CN', label: 'Trung Quốc' },
  { id: 'JP', label: 'Nhật Bản' },
  { id: 'KR', label: 'Hàn Quốc' },
  { id: 'other', label: 'Khác' }
]

const LANGUAGE_OPTIONS = [
  { value: 'all', label: 'Tất cả ngôn ngữ' },
  { value: 'zh-Hans', label: 'Trung (Giản thể)' },
  { value: 'zh-Hant', label: 'Trung (Phồn thể)' },
  { value: 'ja', label: 'Tiếng Nhật' },
  { value: 'ko', label: 'Tiếng Hàn' },
  { value: 'en', label: 'Tiếng Anh' },
  { value: 'vi', label: 'Tiếng Việt' }
]

const CAPABILITY_OPTIONS = [
  { value: 'all', label: 'Tất cả khả năng' },
  { value: 'chapter', label: 'Lấy nội dung chương' },
  { value: 'catalog', label: 'Chỉ đọc mục lục' },
  { value: 'identify', label: 'Nhận diện liên kết' }
]

const HEALTH_OPTIONS = [
  { value: 'all', label: 'Tất cả tình trạng' },
  { value: 'healthy', label: 'Ổn định' },
  { value: 'degraded', label: 'Suy giảm' },
  { value: 'broken', label: 'Hỏng' },
  { value: 'inconclusive', label: 'Chưa xác định' },
  { value: 'unchecked', label: 'Chưa kiểm tra' }
]

export function SourcesScreen({ onOpenSettings, initialSources }: SourcesScreenProps): JSX.Element {
  const [sources, setSources] = useState<SourceDescriptor[]>(initialSources ?? [])
  const [loading, setLoading] = useState(!initialSources)
  const [activeTab, setActiveTab] = useState<'explore' | 'connected' | 'health'>('explore')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [countryGroup, setCountryGroup] = useState<CountryFacet>('all')
  const [languageTag, setLanguageTag] = useState('all')
  const [capability, setCapability] = useState('all')
  const [healthState, setHealthState] = useState('all')

  // URL identify state
  const [isUrlMode, setIsUrlMode] = useState(false)
  const [urlUnrecognized, setUrlUnrecognized] = useState(false)

  // Load from IPC
  const fetchSources = async (): Promise<void> => {
    if (initialSources) return
    setLoading(true)
    try {
      if (typeof window !== 'undefined' && window.mira?.sources?.registry) {
        const res = await window.mira.sources.registry.list()
        if (res.ok) {
          setSources(res.value.sources)
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialSources) {
      void fetchSources()
    }
  }, [initialSources])

  // Handle URL candidate search
  useEffect(() => {
    const trimmed = searchQuery.trim()
    const looksLikeUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('.')
    if (looksLikeUrl && trimmed.length > 5) {
      setIsUrlMode(true)
      let active = true
      if (typeof window !== 'undefined' && window.mira?.sources?.bindings) {
        void window.mira.sources.bindings
          .identify({ workId: '', candidate: trimmed })
          .then((res) => {
            if (!active) return
            if (res.ok && res.value) {
              setUrlUnrecognized(false)
            } else {
              setUrlUnrecognized(true)
            }
          })
          .catch(() => {
            if (active) setUrlUnrecognized(true)
          })
      }
      return () => {
        active = false
      }
    }
    setIsUrlMode(false)
    setUrlUnrecognized(false)
    return undefined
  }, [searchQuery])

  // Clear all filters
  const resetFilters = (): void => {
    setSearchQuery('')
    setCountryGroup('all')
    setLanguageTag('all')
    setCapability('all')
    setHealthState('all')
    setIsUrlMode(false)
    setUrlUnrecognized(false)
  }

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []
    if (searchQuery.trim()) {
      chips.push({
        key: 'search',
        label: `Tìm: "${searchQuery}"`,
        onRemove: () => setSearchQuery('')
      })
    }
    if (countryGroup !== 'all') {
      const label = COUNTRY_OPTIONS.find((c) => c.id === countryGroup)?.label ?? countryGroup
      chips.push({
        key: 'country',
        label: `Quốc gia: ${label}`,
        onRemove: () => setCountryGroup('all')
      })
    }
    if (languageTag !== 'all') {
      const label = LANGUAGE_OPTIONS.find((l) => l.value === languageTag)?.label ?? languageTag
      chips.push({
        key: 'lang',
        label: `Ngôn ngữ: ${label}`,
        onRemove: () => setLanguageTag('all')
      })
    }
    if (capability !== 'all') {
      const label = CAPABILITY_OPTIONS.find((c) => c.value === capability)?.label ?? capability
      chips.push({
        key: 'cap',
        label: `Khả năng: ${label}`,
        onRemove: () => setCapability('all')
      })
    }
    if (healthState !== 'all') {
      const label = HEALTH_OPTIONS.find((h) => h.value === healthState)?.label ?? healthState
      chips.push({
        key: 'health',
        label: `Tình trạng: ${label}`,
        onRemove: () => setHealthState('all')
      })
    }
    return chips
  }, [searchQuery, countryGroup, languageTag, capability, healthState])

  // Filtered sources
  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      // Country facet
      if (countryGroup === 'CN' && s.countryCode !== 'CN') return false
      if (countryGroup === 'JP' && s.countryCode !== 'JP') return false
      if (countryGroup === 'KR' && s.countryCode !== 'KR') return false
      if (
        countryGroup === 'other' &&
        (s.countryCode === 'CN' || s.countryCode === 'JP' || s.countryCode === 'KR')
      ) {
        return false
      }

      // Language
      if (languageTag !== 'all' && !s.languageTags.includes(languageTag)) return false

      // Capability
      if (capability !== 'all') {
        if (capability === 'catalog' && !s.capabilities.includes('catalog' as SourceCapability)) {
          return false
        }
        if (capability === 'chapter' && !s.capabilities.includes('chapter' as SourceCapability)) {
          return false
        }
        if (capability === 'identify' && !s.capabilities.includes('identify' as SourceCapability)) {
          return false
        }
      }

      // Health
      if (healthState !== 'all' && (s.health?.state ?? 'unchecked') !== healthState) {
        return false
      }

      // Search keyword
      if (searchQuery.trim() && !isUrlMode) {
        const needle = searchQuery.toLowerCase().trim()
        const textToSearch = [s.displayName, s.nativeName ?? '', ...s.aliases, ...s.domains]
          .join(' ')
          .toLowerCase()
        if (!textToSearch.includes(needle)) return false
      }

      return true
    })
  }, [sources, countryGroup, languageTag, capability, healthState, searchQuery, isUrlMode])

  // Health tab sources (degraded, broken, inconclusive)
  const healthIssues = useMemo(() => {
    return sources.filter(
      (s) =>
        s.health?.state === 'broken' ||
        s.health?.state === 'degraded' ||
        s.health?.state === 'inconclusive'
    )
  }, [sources])

  // Connected sources
  const connectedSources = useMemo(() => {
    return sources.filter((s) => s.access === 'local' || s.access === 'account')
  }, [sources])

  return (
    <PageFrame
      title="Nguồn nội dung"
      note="Khám phá nền tảng và quản lý khả năng đọc truyện"
      actions={
        <Button
          variant="outline"
          onClick={() => void fetchSources()}
          leftIcon={<RefreshIcon size={ICON.sm} />}
        >
          Làm mới
        </Button>
      }
    >
      <TabsRoot value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <TabsList variant="line" className="mb-md">
          <TabsTab value="explore">Khám phá</TabsTab>
          <TabsTab value="connected">
            Đã kết nối
            {connectedSources.length > 0 && (
              <Badge color="neutral" className="ml-2xs">
                {connectedSources.length}
              </Badge>
            )}
          </TabsTab>
          <TabsTab value="health">
            Tình trạng
            {healthIssues.length > 0 && (
              <Badge color="warning" className="ml-2xs">
                {healthIssues.length}
              </Badge>
            )}
          </TabsTab>
        </TabsList>

        {/* TAB 1: KHÁM PHÁ */}
        <TabsPanel value="explore" className="flex flex-col gap-lg">
          {/* Search bar & facets */}
          <div className="flex flex-col gap-md">
            <div className="flex flex-wrap items-center gap-sm">
              <div className="min-w-[280px] flex-1">
                <SearchInput
                  label="Tìm kiếm nguồn nội dung"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm nguồn, tên bản địa, domain hoặc dán URL..."
                  aria-label="Tìm kiếm nguồn nội dung"
                />
              </div>
            </div>

            {/* Country Facets & Dropdowns */}
            <div className="flex flex-wrap items-center justify-between gap-sm">
              <ButtonGroup
                label="Lọc theo quốc gia"
                value={countryGroup}
                options={COUNTRY_OPTIONS.map((c) => ({ value: c.id, label: c.label }))}
                onChange={(val) => setCountryGroup(val as CountryFacet)}
              />

              <div className="flex flex-wrap items-center gap-xs">
                <Select
                  label="Lọc theo ngôn ngữ"
                  value={languageTag}
                  options={LANGUAGE_OPTIONS}
                  onChange={(val) => setLanguageTag(val)}
                />

                <Select
                  label="Lọc theo khả năng"
                  value={capability}
                  options={CAPABILITY_OPTIONS}
                  onChange={(val) => setCapability(val)}
                />

                <Select
                  label="Lọc theo tình trạng"
                  value={healthState}
                  options={HEALTH_OPTIONS}
                  onChange={(val) => setHealthState(val)}
                />
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-xs pt-2xs">
                <span className="text-body-xs text-muted">Đang lọc:</span>
                {activeChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="inline-flex items-center gap-2xs rounded-xs border border-default bg-muted px-xs py-3xs text-label-xs text-default"
                  >
                    {chip.label}
                    <CompactButton
                      aria-label={`Bỏ lọc ${chip.label}`}
                      onClick={chip.onRemove}
                      icon={<CloseCircleIcon size={ICON.xs} />}
                    />
                  </span>
                ))}
                <LinkButton color="neutral" onClick={resetFilters}>
                  Xóa tất cả bộ lọc
                </LinkButton>
              </div>
            )}
          </div>

          {/* Results section */}
          {loading ? (
            <p role="status" className="py-xl text-center text-body-sm text-subtle">
              Đang tải danh sách nguồn...
            </p>
          ) : isUrlMode && urlUnrecognized ? (
            /* Unrecognized URL error state */
            <EmptyState
              icon={<MinimalisticMagnifierIcon size={ICON.md} />}
              title="Chưa có adapter hỗ trợ liên kết này"
              actions={
                <Button variant="light" onClick={resetFilters}>
                  Xóa tìm kiếm
                </Button>
              }
            >
              Mira hiện chưa có adapter cho website này. Bạn có thể nhập nội dung từ tệp văn bản
              (.txt, .md) hoặc theo dõi thư mục chương trên thiết bị.
            </EmptyState>
          ) : sources.length === 0 ? (
            /* No adapters installed */
            <EmptyState
              icon={<CloseCircleIcon size={ICON.md} />}
              title="Chưa có nguồn nào được cài đặt"
              actions={
                <Button variant="light" onClick={() => void fetchSources()}>
                  Thử tải lại
                </Button>
              }
            >
              Chưa có adapter builtin hoặc chính thức nào trong registry.
            </EmptyState>
          ) : filteredSources.length === 0 ? (
            /* No results from filters */
            <EmptyState
              icon={<MinimalisticMagnifierIcon size={ICON.md} />}
              title="Không có nguồn phù hợp với bộ lọc"
              actions={
                <Button variant="light" onClick={resetFilters}>
                  Xóa tất cả bộ lọc
                </Button>
              }
            >
              Không tìm thấy nguồn nào khớp với các tiêu chí tìm kiếm và bộ lọc đang chọn.
            </EmptyState>
          ) : (
            /* Grid of source cards */
            <div className="grid grid-cols-1 gap-md @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3">
              {filteredSources.map((source) => (
                <SourceCard key={source.sourceId} source={source} onOpenSettings={onOpenSettings} />
              ))}
            </div>
          )}
        </TabsPanel>

        {/* TAB 2: ĐÃ KẾT NỐI */}
        <TabsPanel value="connected" className="flex flex-col gap-lg">
          {connectedSources.length === 0 ? (
            <EmptyState
              icon={<MinimalisticMagnifierIcon size={ICON.md} />}
              title="Chưa có nguồn nào được kết nối"
              actions={
                <Button variant="light" onClick={() => setActiveTab('explore')}>
                  Khám phá nguồn
                </Button>
              }
            >
              Chưa có nguồn nào được gắn với tác phẩm. Bạn có thể thêm Bản raw trong khu vực chi
              tiết tác phẩm.
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-md @min-[640px]:grid-cols-2">
              {connectedSources.map((source) => (
                <SourceCard key={source.sourceId} source={source} onOpenSettings={onOpenSettings} />
              ))}
            </div>
          )}
        </TabsPanel>

        {/* TAB 3: TÌNH TRẠNG */}
        <TabsPanel value="health" className="flex flex-col gap-lg">
          {healthIssues.length === 0 ? (
            <EmptyState
              icon={<RefreshIcon size={ICON.md} />}
              title="Tất cả các nguồn đang hoạt động bình thường"
            >
              Không có adapter nào gặp sự cố, suy giảm hoặc cần xác minh phiên đăng nhập.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-md">
              <p className="m-0 text-body-sm text-subtle">
                Các nguồn dưới đây đang có vấn đề về kết nối hoặc bộ phân tích:
              </p>
              <div className="grid grid-cols-1 gap-md @min-[640px]:grid-cols-2">
                {healthIssues.map((source) => (
                  <SourceCard
                    key={source.sourceId}
                    source={source}
                    onOpenSettings={onOpenSettings}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsPanel>
      </TabsRoot>
    </PageFrame>
  )
}
