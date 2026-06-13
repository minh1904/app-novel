import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { Novel } from '@/types/novel';

const TAG_OPTIONS = [
  'Tiên Hiệp',
  'Tu Tiên',
  'Huyền Huyễn',
  'Võ Hiệp',
  'Kiếm Hiệp',
  'Mạo Hiểm',
  'Chiến Đấu',
  'Dị Giới',
  'Xuyên Không',
  'Hệ Thống',
  'Hài Hước',
  'Lãng Mạn',
  'Lịch Sử',
  'Thần Thoại',
  'Thần Thánh',
  'Sử Thi',
  'Kinh Điển',
  'Phàm Nhân',
  'Lão Bài',
  'Hiện Đại',
  'Võ Hồn',
  'Manhwa',
].map((t) => ({ label: t, value: t }));

export interface NovelFormData {
  title: string;
  originalTitle: string;
  alternativeTitles: string[];
  author: string;
  tags: string[];
  sources: string[];
  description: string;
}

interface NovelFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Novel;
  onSubmit: (data: NovelFormData) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      {children}
    </div>
  );
}

function DynamicListField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex flex-col gap-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input
              value={v}
              placeholder={placeholder}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon icon="solar:close-circle-linear" width={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...values, ''])}
          className="flex items-center gap-1 self-start rounded px-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon icon="mynaui:plus" width={12} />
          Thêm
        </button>
      </div>
    </Field>
  );
}

const DEFAULT_FORM: NovelFormData = {
  title: '',
  originalTitle: '',
  alternativeTitles: [],
  author: '',
  tags: [],
  sources: [],
  description: '',
};

export function NovelFormSheet({ open, onOpenChange, initialData, onSubmit }: NovelFormSheetProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<NovelFormData>(DEFAULT_FORM);

  useEffect(() => {
    if (open) {
      setForm(
        initialData
          ? {
              title: initialData.title,
              originalTitle: initialData.originalTitle ?? '',
              alternativeTitles: initialData.alternativeTitles ?? [],
              author: initialData.author ?? '',
              tags: initialData.tags ?? [],
              sources: initialData.sources ?? [],
              description: initialData.description ?? '',
            }
          : DEFAULT_FORM,
      );
    }
  }, [open, initialData]);

  function set<K extends keyof NovelFormData>(key: K, value: NovelFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!form.title.trim()) return;
    onSubmit(form);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-border border-b px-5 py-4">
          <SheetTitle>{isEdit ? 'Chỉnh sửa truyện' : 'Thêm truyện mới'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Cập nhật thông tin bộ truyện.' : 'Điền thông tin để bắt đầu dịch.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-3">
            <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
              Tên & Tác giả
            </p>

            <Field label="Tên truyện *">
              <Input
                placeholder="Ví dụ: Đấu Phá Thương Khung"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </Field>

            <Field label="Mô tả">
              <Textarea
                placeholder="Tóm tắt nội dung bộ truyện..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="min-h-20 resize-none"
              />
            </Field>

            <Field label="Tên gốc">
              <Input
                placeholder="Ví dụ: 斗破苍穹"
                value={form.originalTitle}
                onChange={(e) => set('originalTitle', e.target.value)}
              />
            </Field>

            <DynamicListField
              label="Tên khác"
              values={form.alternativeTitles}
              onChange={(v) => set('alternativeTitles', v)}
              placeholder="Ví dụ: Battle Through the Heavens"
            />

            <Field label="Tác giả">
              <Input
                placeholder="Ví dụ: Thiên Tằm Thổ Đậu"
                value={form.author}
                onChange={(e) => set('author', e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3">
            <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
              Phân loại
            </p>

            <Field label="Thể loại">
              <MultiSelect
                options={TAG_OPTIONS}
                value={form.tags}
                onValueChange={(v) => set('tags', v)}
                placeholder="Chọn thể loại..."
                searchable
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3">
            <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
              Nguồn raw
            </p>

            <DynamicListField
              label="Link nguồn"
              values={form.sources}
              onChange={(v) => set('sources', v)}
              placeholder="Ví dụ: qidian.com/book/..."
            />
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-border border-t px-5 py-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!form.title.trim()}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo truyện'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
