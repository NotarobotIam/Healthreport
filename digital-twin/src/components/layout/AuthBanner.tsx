import banner from '../../assets/myhealthcarereport-banner.png';

/**
 * The MyHealthCareReport.Ai brand banner shown above the Login and Register cards. The wordmark and
 * tagline ("Personal health information, made clearer.") are baked into the image itself, so the alt text
 * repeats them for anyone using a screen reader.
 */
export function AuthBanner() {
  return (
    <img
      src={banner}
      alt="MyHealthCareReport.Ai — Personal health information, made clearer."
      width={1584}
      height={396}
      className="mb-5 w-full max-w-[440px] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
    />
  );
}
