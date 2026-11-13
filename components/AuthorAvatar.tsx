import Image from 'next/image';
import type { Author } from '@/lib/blog-data';
import { createDomainFallbackSvg } from '@/lib/avatar-fallback';
import { isProfileImageUrl } from '@/lib/images/urls';
import { svgToDataUri } from '@/lib/svg';

type AuthorAvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const FRAME: Record<AuthorAvatarSize, string> = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
  xl: 'h-28 w-28',
};

const PIXELS: Record<AuthorAvatarSize, number> = { sm: 40, md: 56, lg: 80, xl: 112 };

export default function AuthorAvatar({
  author,
  size = 'lg',
}: {
  author: Author;
  size?: AuthorAvatarSize;
}) {
  const px = PIXELS[size];
  const frame = `relative shrink-0 overflow-hidden rounded-xl border border-line bg-surface-inverse shadow-sm ${FRAME[size]}`;

  return (
    <div className={frame}>
      {isProfileImageUrl(author.avatar) ? (
        <Image
          src={author.avatar}
          alt={author.name}
          width={px}
          height={px}
          className="h-full w-full object-cover"
        />
      ) : (
        // A data-URI SVG: next/image does not serve SVG and the payload is
        // already inline, so the optimizer would add a round trip for nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={svgToDataUri(createDomainFallbackSvg(author.name, author.domain, author.role))}
          alt={author.name}
          width={px}
          height={px}
          className="h-full w-full"
        />
      )}
    </div>
  );
}
