import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { mediaUrl } from '../../../utils/mediaUrl';

export default function SalesProductImage({ source }) {
  const url = source?.image_signed_url ? mediaUrl({ image_signed_url: source.image_signed_url }, 'image_url') : null;
  const [failed, setFailed] = useState(null);
  return <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
    {url && failed !== url ? <img src={url} alt="" loading="lazy" className="h-full w-full rounded-lg object-contain"
      onError={() => setFailed(url)} /> : <Package size={24} aria-hidden="true" className="text-slate-400" />}
  </span>;
}
