"use client";
import { Button } from "@/components/ui/button";
import {
  Play,
  Loader2,
  Redo2,
  Undo2,
  RotateCcw,
  ArrowRightFromLine,

  ArrowUpRight,

} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PresentationGenerationApi } from "../../services/api/presentation-generation";
import { useDispatch, useSelector } from "react-redux";


import { RootState } from "@/store/store";
import { toast } from "sonner";


import { trackEvent, MixpanelEvent } from "@/utils/mixpanel";
import { usePresentationUndoRedo } from "../hooks/PresentationUndoRedo";
import ToolTip from "@/components/ToolTip";
import { clearPresentationData } from "@/store/slices/presentationGeneration";
import { clearHistory } from "@/store/slices/undoRedoSlice";
import { Separator } from "@/components/ui/separator";
import ThemeSelector from "./ThemeSelector";
import { DEFAULT_THEMES } from "../../(dashboard)/theme/components/ThemePanel/constants";
import ThemeApi from "../../services/api/theme";
import { Theme } from "../../services/api/types";
import MarkdownRenderer from "@/components/MarkDownRender";

const PresentationHeader = ({
  presentation_id,
  isPresentationSaving,
  currentSlide,
}: {
  presentation_id: string;
  isPresentationSaving: boolean;
  currentSlide?: number;
}) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [themes, setThemes] = useState<Theme[]>([]);

  const pathname = usePathname();
  const dispatch = useDispatch();


  const { presentationData, isStreaming } = useSelector(
    (state: RootState) => state.presentationGeneration
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [customThemes] = await Promise.all([
          ThemeApi.getThemes(),
        ]);
        setThemes([...customThemes, ...DEFAULT_THEMES]);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load themes");
      }
    };
    if (themes.length === 0) {
      load();
    }
  }, []);

  const { onUndo, onRedo, canUndo, canRedo } = usePresentationUndoRedo();

  const openExportWindow = (format: "pdf" | "pptx") => {
    const title = encodeURIComponent(presentationData?.title || "presentation");
    const url = `/pdf-maker?id=${presentation_id}&export=${format}&title=${title}`;
    window.open(url, "_blank", "width=1440,height=900,noopener");
  };

  const handleExportPptx = async () => {
    if (isStreaming) return;
    try {
      setIsExporting(true);
      trackEvent(MixpanelEvent.Header_UpdatePresentationContent_API_Call);
      await PresentationGenerationApi.updatePresentationContent(presentationData);
      trackEvent(MixpanelEvent.Header_ExportAsPPTX_API_Call);
      openExportWindow("pptx");
      toast.success("Exporting PPTX…", { description: "Your file will download in the new tab." });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Having trouble exporting!", {
        description: "We are having trouble exporting your presentation. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (isStreaming) return;
    try {
      setIsExporting(true);
      trackEvent(MixpanelEvent.Header_UpdatePresentationContent_API_Call);
      await PresentationGenerationApi.updatePresentationContent(presentationData);
      trackEvent(MixpanelEvent.Header_ExportAsPDF_API_Call);
      openExportWindow("pdf");
      toast.success("Exporting PDF…", { description: "Your file will download in the new tab." });
    } catch (err) {
      console.error(err);
      toast.error("Having trouble exporting!", {
        description: "We are having trouble exporting your presentation. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleReGenerate = () => {
    dispatch(clearPresentationData());
    dispatch(clearHistory())
    trackEvent(MixpanelEvent.Header_ReGenerate_Button_Clicked, { pathname });
    router.push(`/presentation?id=${presentation_id}&stream=true`);
  };
  const ExportOptions = ({ mobile }: { mobile: boolean }) => (
    <div className={` rounded-[18px] max-md:mt-4 ${mobile ? "" : "bg-white"}  p-5`}>
      <p className="text-sm font-medium text-[#19001F]">Export as</p>
      <div className="my-[18px] h-[1px] bg-[#E8E8E8]" />
      <div className="space-y-3">

        <Button
          onClick={() => {
            trackEvent(MixpanelEvent.Header_Export_PDF_Button_Clicked, { pathname });
            handleExportPdf();
            setOpen(false);
          }}
          variant="ghost"
          className={`  rounded-none px-0 w-full text-xs flex justify-start text-black hover:bg-transparent ${mobile ? "bg-white py-6 border-none rounded-lg" : ""}`} >

          PDF
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
        <Button
          onClick={() => {
            trackEvent(MixpanelEvent.Header_Export_PPTX_Button_Clicked, { pathname });
            handleExportPptx();
            setOpen(false);
          }}
          variant="ghost"
          className={`w-full flex px-0 justify-start text-xs text-black hover:bg-transparent  ${mobile ? "bg-white py-6" : ""}`}
        >

          PPTX
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </div>


    </div>
  );




  return (
    <>
      <div className="py-7 sticky top-0 bg-white z-50 mb-[17px]  font-syne flex justify-between items-center">
        <h2 className="text-lg text-[#101323] font-unbounded "><MarkdownRenderer content={presentationData?.title || "Presentation"} className="mb-0  w-[600px] truncate text-sm text-[#101323] " /></h2>
        <div className="flex items-center gap-2.5">

          {isPresentationSaving && <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </div>}
          <ThemeSelector presentation_id={presentation_id} current_theme={presentationData?.theme || {}} themes={themes} />

          <div className="flex items-center gap-2 bg-[#F6F6F9] px-3.5 h-[38px] border border-[#EDECEC] rounded-[80px]">

            <ToolTip content="Regenerate Presentation">
              <button onClick={handleReGenerate} className="group">
                <RotateCcw className="w-3.5 h-3.5 text-[#101323] group-hover:text-[#5141e5] duration-300" />
              </button>
            </ToolTip>
            <Separator orientation="vertical" className="h-4" />
            <ToolTip content="Undo">
              <button disabled={!canUndo} className=" disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group" onClick={() => {
                onUndo();
              }}>

                <Undo2 className="w-3.5 h-3.5 text-[#101323] group-hover:text-[#5141e5] duration-300" />

              </button>
            </ToolTip>
            <Separator orientation="vertical" className="h-4" />
            <ToolTip content="Redo">

              <button disabled={!canRedo} className=" disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group" onClick={() => {

                onRedo();
              }}>
                <Redo2 className="w-3.5 h-3.5 text-[#101323] group-hover:text-[#5141e5] duration-300" />

              </button>
            </ToolTip>
            <Separator orientation="vertical" className="h-4 w-[2px]" />
            <ToolTip content="Present">
              <button
                onClick={() => {
                  const to = `?id=${presentation_id}&mode=present&slide=${currentSlide || 0}`;
                  trackEvent(MixpanelEvent.Navigation, { from: pathname, to });
                  router.push(to);
                }}
                disabled={!presentationData?.slides || presentationData?.slides.length === 0} className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group">
                <Play className="w-3.5 h-3.5 text-[#101323] group-hover:text-[#5141e5] duration-300" />
              </button>
            </ToolTip>
          </div>

          <Popover open={open} onOpenChange={setOpen} >
            <PopoverTrigger asChild>
              <button className="flex  items-center gap-[7px] px-[18px] py-[11px] rounded-[53px] text-sm font-semibold text-[#101323]"
                style={{
                  background: "linear-gradient(270deg, #D5CAFC 2.4%, #E3D2EB 27.88%, #F4DCD3 69.23%, #FDE4C2 100%)",
                }}
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Export"} <ArrowRightFromLine className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[200px] rounded-[18px] space-y-2 p-0  ">
              <ExportOptions mobile={false} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  );
};

export default PresentationHeader;
