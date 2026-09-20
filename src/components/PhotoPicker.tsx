import { useEffect, useMemo, useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { BUCKETS, MAX_PHOTOS } from '@/lib/constants'
import { publicUrl } from '@/lib/images'

interface Props {
  keepPaths: string[]
  newFiles: File[]
  onChange: (next: { keepPaths: string[]; newFiles: File[] }) => void
}

export function PhotoPicker({ keepPaths, newFiles, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const previews = useMemo(() => newFiles.map((f) => URL.createObjectURL(f)), [newFiles])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const total = keepPaths.length + newFiles.length
  const room = MAX_PHOTOS - total

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const picked = Array.from(list).filter((f) => f.type.startsWith('image/')).slice(0, room)
    if (picked.length) onChange({ keepPaths, newFiles: [...newFiles, ...picked] })
    if (input.current) input.current.value = ''
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {keepPaths.map((p) => (
          <Thumb key={p} src={publicUrl(BUCKETS.collection, p)!} onRemove={() => onChange({ keepPaths: keepPaths.filter((x) => x !== p), newFiles })} />
        ))}
        {previews.map((src, i) => (
          <Thumb key={src} src={src} onRemove={() => onChange({ keepPaths, newFiles: newFiles.filter((_, j) => j !== i) })} />
        ))}
        {room > 0 && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-mute transition-colors hover:border-gold hover:text-gold"
          >
            <ImagePlus size={20} />
            <span className="text-[11px] font-medium">Add photo</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      <p className="hint">
        Up to {MAX_PHOTOS} photos. Show the disc, the case front and any scratches — buyers trust listings with real photos.
      </p>
    </div>
  )
}

function Thumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-raised">
      <img src={src} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
      >
        <X size={14} />
      </button>
    </div>
  )
}
