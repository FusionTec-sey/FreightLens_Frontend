import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { mediaUrl } from '../../../utils/mediaUrl';

export default function SalesProductImage({ source, size = 'normal' }) {
  const url = source?.image_signed_url ? mediaUrl({ image_signed_url: source.image_signed_url }, 'image_url') : null;
  const [failed, setFailed] = useState(null);
  return <span className={`flex shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 ${size === 'card' ? 'h-24 w-full' : size === 'small' ? 'h-10 w-10' : 'h-16 w-16'}`}>
    {url && failed !== url ? <img src={url} alt="" loading="lazy" className="h-full w-full rounded-lg object-contain"
      onError={() => setFailed(url)} /> : <Package size={24} aria-hidden="true" className="text-slate-400" />}
  </span>;
}
