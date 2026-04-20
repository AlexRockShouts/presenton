"use client";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { trackEvent, MixpanelEvent } from "@/utils/mixpanel";
import { AlertCircle, Loader2 } from "lucide-react";
import { setPresentationData } from "@/store/slices/presentationGeneration";
import { DashboardApi } from "../services/api/dashboard";
import { V1ContentRender } from "../components/V1ContentRender";
import { useFontLoader } from "../hooks/useFontLoad";
import { Theme } from "../services/api/types";
import { sanitizeFilename } from "@/app/(presentation-generator)/utils/others";

interface PdfMakerPageProps {
  presentation_id: string;
  exportMode?: "pdf" | "pptx" | null;
  exportTitle?: string;
}

const PresentationPage = ({ presentation_id, exportMode, exportTitle }: PdfMakerPageProps) => {
  const pathname = usePathname();
  const [contentLoading, setContentLoading] = useState(true);
  const [exportStatus, setExportStatus] = useState<"idle" | "capturing" | "done" | "error">("idle");
  const exportStarted = useRef(false);

  const dispatch = useDispatch();
  const { presentationData } = useSelector(
    (state: RootState) => state.presentationGeneration
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    if (presentationData?.slides[0].layout.includes("custom")) {
      const existingScript = document.querySelector(
        'script[src*="tailwindcss.com"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://cdn.tailwindcss.com";
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, [presentationData]);

  useEffect(() => {
    fetchUserSlides();
  }, []);

  const fetchUserSlides = async () => {
    try {
      const data = await DashboardApi.getPresentation(presentation_id);
      dispatch(setPresentationData(data));
      setContentLoading(false);
      if (data?.theme) {
        applyTheme(data.theme);
      }
    } catch (error) {
      setError(true);
      toast.error("Failed to load presentation");
      console.error("Error fetching user slides:", error);
      setContentLoading(false);
    }
  };

  const applyTheme = async (theme: Theme) => {
    const element = document.getElementById('presentation-slides-wrapper')
    if (!element) return;
    if (!theme || !theme.data) { return; }
    if (!theme.data.colors['graph_0']) { return; }
    const cssVariables = {
      '--primary-color': theme.data.colors['primary'],
      '--background-color': theme.data.colors['background'],
      '--card-color': theme.data.colors['card'],
      '--stroke': theme.data.colors['stroke'],
      '--primary-text': theme.data.colors['primary_text'],
      '--background-text': theme.data.colors['background_text'],
      '--graph-0': theme.data.colors['graph_0'],
      '--graph-1': theme.data.colors['graph_1'],
      '--graph-2': theme.data.colors['graph_2'],
      '--graph-3': theme.data.colors['graph_3'],
      '--graph-4': theme.data.colors['graph_4'],
      '--graph-5': theme.data.colors['graph_5'],
      '--graph-6': theme.data.colors['graph_6'],
      '--graph-7': theme.data.colors['graph_7'],
      '--graph-8': theme.data.colors['graph_8'],
      '--graph-9': theme.data.colors['graph_9'],
    }

    Object.entries(cssVariables).forEach(([key, value]) => {
      element.style.setProperty(key, value)
    })
    useFontLoader({ [theme.data.fonts.textFont.name]: theme.data.fonts.textFont.url })

    element.style.setProperty('font-family', `"${theme.data.fonts.textFont.name}"`)
    element.style.setProperty('--heading-font-family', `"${theme.data.fonts.textFont.name}"`)
    element.style.setProperty('--body-font-family', `"${theme.data.fonts.textFont.name}"`)
  }

  // Trigger export after slides render
  useEffect(() => {
    if (!exportMode || contentLoading || !presentationData?.slides?.length || exportStarted.current) return;
    exportStarted.current = true;

    // Wait for fonts and images to fully render before capturing
    const delay = presentationData.slides.length > 5 ? 3000 : 2000;
    const timer = setTimeout(() => runExport(), delay);
    return () => clearTimeout(timer);
  }, [exportMode, contentLoading, presentationData]);

  const runExport = async () => {
    setExportStatus("capturing");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const slideWrappers = document.querySelectorAll<HTMLElement>('[data-slide-export]');

      if (slideWrappers.length === 0) {
        throw new Error("No slides found for export");
      }

      const canvases: HTMLCanvasElement[] = [];
      for (const wrapper of slideWrappers) {
        const slideEl = wrapper.querySelector<HTMLElement>('.aspect-video') ?? wrapper;
        const canvas = await html2canvas(slideEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        canvases.push(canvas);
      }

      const title = sanitizeFilename(exportTitle || "presentation");

      if (exportMode === "pdf") {
        await exportAsPdf(canvases, title);
      } else {
        await exportAsPptx(canvases, title);
      }

      setExportStatus("done");
      setTimeout(() => window.close(), 1500);
    } catch (err) {
      console.error("Export failed:", err);
      setExportStatus("error");
    }
  };

  const exportAsPdf = async (canvases: HTMLCanvasElement[], title: string) => {
    const { jsPDF } = await import("jspdf");
    const firstCanvas = canvases[0];
    const w = firstCanvas.width / 2; // account for scale:2
    const h = firstCanvas.height / 2;
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [w, h] });

    canvases.forEach((canvas, i) => {
      if (i > 0) pdf.addPage([w, h], "landscape");
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, w, h);
    });

    pdf.save(`${title}.pdf`);
  };

  const exportAsPptx = async (canvases: HTMLCanvasElement[], title: string) => {
    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_16x9";

    for (const canvas of canvases) {
      const slide = pptx.addSlide();
      slide.addImage({ data: canvas.toDataURL("image/jpeg", 0.95), x: 0, y: 0, w: "100%", h: "100%" });
    }

    await pptx.writeFile({ fileName: `${title}.pptx` });
  };

  if (exportMode) {
    return (
      <div className="relative">
        {(exportStatus === "capturing" || exportStatus === "idle") && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#5141e5]" />
            <p className="text-sm font-medium text-gray-700">
              {exportStatus === "capturing" ? `Generating ${exportMode?.toUpperCase()}…` : "Loading slides…"}
            </p>
          </div>
        )}
        {exportStatus === "done" && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center gap-3">
            <p className="text-lg font-semibold text-green-600">Download started!</p>
            <p className="text-sm text-gray-500">This tab will close automatically.</p>
          </div>
        )}
        {exportStatus === "error" && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-base font-semibold text-red-600">Export failed</p>
            <Button variant="outline" onClick={() => { exportStarted.current = false; runExport(); }}>Retry</Button>
          </div>
        )}
        <SlidesRenderer
          presentationData={presentationData}
          contentLoading={contentLoading}
          exportMode={exportMode}
        />
      </div>
    );
  }

  // Regular (non-export) view
  return (
    <div className="flex overflow-hidden flex-col">
      {error ? (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
          <div
            className="bg-white border border-red-300 text-red-700 px-6 py-8 rounded-lg shadow-lg flex flex-col items-center"
            role="alert"
          >
            <AlertCircle className="w-16 h-16 mb-4 text-red-500" />
            <strong className="font-bold text-4xl mb-2">Oops!</strong>
            <p className="block text-2xl py-2">
              We encountered an issue loading your presentation.
            </p>
            <p className="text-lg py-2">
              Please check your internet connection or try again later.
            </p>
            <Button
              className="mt-4 bg-red-500 text-white hover:bg-red-600 focus:ring-4 focus:ring-red-300"
              onClick={() => {
                trackEvent(MixpanelEvent.PdfMaker_Retry_Button_Clicked, { pathname });
                window.location.reload();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <div className="">
          <div
            id="presentation-slides-wrapper"
            className="mx-auto flex flex-col items-center  overflow-hidden  justify-center   "
          >
            {!presentationData ||
              contentLoading ||
              !presentationData?.slides ||
              presentationData?.slides.length === 0 ? (
              <div className="relative w-full h-[calc(100vh-120px)] mx-auto ">
                <div className=" ">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="aspect-video bg-gray-400 my-4 w-full mx-auto max-w-[1280px]"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {presentationData &&
                  presentationData.slides &&
                  presentationData.slides.length > 0 &&
                  presentationData.slides.map((slide: any, index: number) => (
                    <div key={index} className="w-full" data-speaker-note={slide.speaker_note}>
                      <V1ContentRender slide={slide} isEditMode={true} theme={null}
                      />
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Separate component to render slides for capture
const SlidesRenderer = ({
  presentationData,
  contentLoading,
  exportMode,
}: {
  presentationData: any;
  contentLoading: boolean;
  exportMode: "pdf" | "pptx";
}) => {
  if (contentLoading || !presentationData?.slides?.length) {
    return (
      <div className="w-full p-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="aspect-video bg-gray-200 my-4 w-full max-w-[1280px] mx-auto" />
        ))}
      </div>
    );
  }

  return (
    <div id="presentation-slides-wrapper" className="flex flex-col items-center">
      {presentationData.slides.map((slide: any, index: number) => (
        <div
          key={index}
          data-slide-export={index}
          data-speaker-note={slide.speaker_note}
          className="w-full max-w-[1280px] my-2"
        >
          <V1ContentRender slide={slide} isEditMode={false} theme={null} />
        </div>
      ))}
    </div>
  );
};

export default PresentationPage;
