export interface ParsedVideo {
  title: string;
  transcript: string;
  order: number;
}

export interface ParsedSection {
  title: string;
  order: number;
  videos: ParsedVideo[];
  unitId?: string;
}

export function parseCourseStructure(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let currentVideo: ParsedVideo | null = null;
  let sectionOrder = 0;
  let videoOrder = 0;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const sectionMatch = line.match(/^===\s*(.+?)\s*===$/);
    const videoMatch = line.match(/^---\s*(.+?)\s*---$/);

    if (sectionMatch) {
      if (currentVideo && currentSection) {
        currentSection.videos.push({ ...currentVideo, transcript: currentVideo.transcript.trim() });
        currentVideo = null;
      }
      if (currentSection) sections.push(currentSection);
      currentSection = { title: sectionMatch[1], order: ++sectionOrder, videos: [] };
      videoOrder = 0;
    } else if (videoMatch) {
      if (currentVideo && currentSection) {
        currentSection.videos.push({ ...currentVideo, transcript: currentVideo.transcript.trim() });
      }
      if (!currentSection) {
        currentSection = { title: "General", order: ++sectionOrder, videos: [] };
      }
      currentVideo = { title: videoMatch[1], transcript: "", order: ++videoOrder };
    } else if (currentVideo) {
      // Skip bare line numbers (subtitle timestamps) and URLs
      const isNumber = /^\d+$/.test(line);
      const isUrl = /^https?:\/\//i.test(line);
      if (!isNumber && !isUrl && line.length > 0) {
        currentVideo.transcript += line + " ";
      }
    }
  }

  if (currentVideo && currentSection) {
    currentSection.videos.push({ ...currentVideo, transcript: currentVideo.transcript.trim() });
  }
  if (currentSection) sections.push(currentSection);

  return sections;
}
