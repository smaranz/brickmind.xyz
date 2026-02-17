import { create } from "zustand";

export type AppView = "landing" | "dashboard";
export type SidebarTab = "chat" | "collection" | "community" | "settings" | "builder" | "ldraw";
export type AIStatus = "Online" | "Scanning" | "Thinking";
export type BuildStage = "intent" | "constraint" | "crunching" | "presentation" | "viewing" | "instructions";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  imageUrl?: string;
}

export interface BrickPart {
  id: string;
  name: string;
  color: string;
  colorHex: string;
  qty: number;
  shape: "plate" | "brick" | "slope" | "tile" | "round" | "technic" | "special";
  width: number;
  height: number;
}

export interface BuildStep {
  stepNum: number;
  partsAdded: Array<{ partId: string; position: { x: number; y: number; z: number }; rotation: number }>;
  description: string;
  cameraAngle: { rotateX: number; rotateY: number };
}

export interface ModelOption {
  name: string;
  subtitle: string;
  partCount: number;
  difficulty: "Novice" | "Intermediate" | "Expert";
  estimatedTime: number;
  bricks: Array<{
    id: string;
    partId: string;
    color: string;
    colorHex: string;
    position: { x: number; y: number; z: number };
    size: { w: number; h: number; d: number };
    rotation: number;
    delay: number;
  }>;
}

export interface BuildData {
  prompt: string;
  brickLimit: number;
  partsList: BrickPart[];
  steps: BuildStep[];
  modelOptions: [ModelOption, ModelOption];
}

interface AppState {
  view: AppView;
  sidebarTab: SidebarTab;
  sidebarOpen: boolean;
  aiStatus: AIStatus;
  voiceMode: boolean;
  settingsOpen: boolean;
  cameraOpen: boolean;
  sessionId: string;
  messages: ChatMessage[];
  isTransitioning: boolean;

  hapticFeedback: boolean;
  turboMode: boolean;
  voiceOutput: boolean;

  buildStage: BuildStage;
  buildPrompt: string;
  buildData: BuildData | null;
  selectedOption: 0 | 1 | null;
  currentStep: number;
  highlightedPartId: string | null;
  miniMapVisible: boolean;

  setView: (view: AppView) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setAIStatus: (status: AIStatus) => void;
  setVoiceMode: (mode: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setCameraOpen: (open: boolean) => void;
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setIsTransitioning: (t: boolean) => void;
  setHapticFeedback: (v: boolean) => void;
  setTurboMode: (v: boolean) => void;
  setVoiceOutput: (v: boolean) => void;
  newSession: () => void;

  setBuildStage: (stage: BuildStage) => void;
  setBuildPrompt: (prompt: string) => void;
  setBuildData: (data: BuildData | null) => void;
  setSelectedOption: (option: 0 | 1 | null) => void;
  setCurrentStep: (step: number) => void;
  setHighlightedPartId: (id: string | null) => void;
  setMiniMapVisible: (visible: boolean) => void;
  resetBuild: () => void;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const useAppStore = create<AppState>((set) => ({
  view: "landing",
  sidebarTab: "chat",
  sidebarOpen: true,
  aiStatus: "Online",
  voiceMode: false,
  settingsOpen: false,
  cameraOpen: false,
  sessionId: generateId(),
  messages: [],
  isTransitioning: false,
  hapticFeedback: true,
  turboMode: false,
  voiceOutput: false,

  buildStage: "intent",
  buildPrompt: "",
  buildData: null,
  selectedOption: null,
  currentStep: 0,
  highlightedPartId: null,
  miniMapVisible: false,

  setView: (view) => set({ view }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setAIStatus: (status) => set({ aiStatus: status }),
  setVoiceMode: (mode) => set({ voiceMode: mode }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setCameraOpen: (open) => set({ cameraOpen: open }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setIsTransitioning: (t) => set({ isTransitioning: t }),
  setHapticFeedback: (v) => set({ hapticFeedback: v }),
  setTurboMode: (v) => set({ turboMode: v }),
  setVoiceOutput: (v) => set({ voiceOutput: v }),
  newSession: () =>
    set({ sessionId: generateId(), messages: [] }),

  setBuildStage: (stage) => set({ buildStage: stage }),
  setBuildPrompt: (prompt) => set({ buildPrompt: prompt }),
  setBuildData: (data) => set({ buildData: data }),
  setSelectedOption: (option) => set({ selectedOption: option }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setHighlightedPartId: (id) => set({ highlightedPartId: id }),
  setMiniMapVisible: (visible) => set({ miniMapVisible: visible }),
  resetBuild: () =>
    set({
      buildStage: "intent",
      buildPrompt: "",
      buildData: null,
      selectedOption: null,
      currentStep: 0,
      highlightedPartId: null,
      miniMapVisible: false,
    }),
}));
