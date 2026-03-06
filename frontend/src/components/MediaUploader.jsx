import { Button, Chip } from "@heroui/react";
import { Upload } from "lucide-react";

export default function MediaUploader({ images = [], setImages, video, setVideo, svc }) {
  const onPickImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const ups = await svc.uploadImages(files);
    setImages([...(images || []), ...ups.map(u => u.url)]);
  };

  const onPickVideo = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const up = await svc.uploadVideo(f);
    setVideo(up.url);
  };

  return (
    <div className="space-y-2">
      <Button as="label" variant="bordered" startContent={<Upload size={15} />} className="cursor-pointer">
        Upload ảnh
        <input hidden accept="image/*" type="file" multiple onChange={onPickImages} />
      </Button>
      <div className="flex flex-wrap gap-2">
        {(images || []).map((url, i) => (
          <Chip key={i} onClose={() => setImages(images.filter((_, idx) => idx !== i))}>
            Ảnh {i + 1}
          </Chip>
        ))}
      </div>

      <Button as="label" variant="bordered" startContent={<Upload size={15} />} className="cursor-pointer">
        Upload video (1)
        <input hidden accept="video/*" type="file" onChange={onPickVideo} />
      </Button>
      {video && <Chip onClose={() => setVideo(null)}>Đã có video</Chip>}
    </div>
  );
}
