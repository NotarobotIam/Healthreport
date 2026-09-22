import banner from '../../assets/myhealthcarereport-banner.png';

/**
 * The MyHealthCareReport.Ai banner, shown above the "Digital Twin Platform" nav bar on every page behind
 * login (see AuthBanner for the same image on Login/Register). It spans the full width of the header.
 *
 * The source image (1584×396) is mostly quiet navy padding above and below the logo lockup — the icon,
 * wordmark and tagline only occupy the middle ~52% of its height (measured directly from the pixels: the
 * first non-background pixel is at 26.5% down, the last at 78.3%). Showing it at its natural 4:1 ratio
 * (the full-bleed h-auto this replaced) made for a very tall strip; cropping the box to a shorter 6.5:1
 * ratio with `object-cover` keeps it noticeably shorter while still showing the whole lockup with a ~5%
 * margin on each side — the crop only ever eats into the empty padding, never the logo or text.
 */
export function BrandHeader() {
  return (
    <div className="shrink-0 overflow-hidden bg-gradient-to-br from-[#06183e] to-[#0b4267]">
      <img
        src={banner}
        alt="MyHealthCareReport.Ai — Personal health information, made clearer."
        width={1584}
        height={396}
        className="block aspect-[13/2] w-full object-cover object-center"
      />
    </div>
  );
}
