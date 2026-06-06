import type { Metadata } from "next";
import HeimClient from "@/app/heim/HeimClient";
import "@/app/heim/heim.css";

export const metadata: Metadata = {
  title: "Pilar — AI Structural Assistant",
  description:
    "Describe a structural problem and get a checked calculation, ready for professional review.",
};

// English canonical landing. Reuses the marketing landing surface (HeimClient)
// in English, without the first-visit region modal. /heim is unchanged and
// keeps its nb/nn behaviour; the app header is hidden here (see
// ConditionalAppHeader) because HeimClient renders its own MarketingHeader.
export default function HomePage() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{document.documentElement.classList.add('js-anim')}catch(e){}",
        }}
      />
      <HeimClient lang="en" showRegionModal={false} startHref="/international" />
    </>
  );
}
