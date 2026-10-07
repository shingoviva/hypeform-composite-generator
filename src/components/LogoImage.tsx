import { useEffect, useState, ImgHTMLAttributes } from 'react';
import { prepareLogo } from '../logoImage';

export default function LogoImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [prepared, setPrepared] = useState<{ source: string; url: string }>();
  useEffect(() => {
    let active = true;
    if (src) prepareLogo(src).then(url => { if (active) setPrepared({ source: src, url }); }).catch(() => {});
    return () => { active = false; };
  }, [src]);
  return <img {...props} src={prepared?.source === src ? prepared.url : src} />;
}
