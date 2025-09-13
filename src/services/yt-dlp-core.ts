import YTDlpWrap from 'yt-dlp-wrap';

// Yt-dlp format interface (based on official yt-dlp documentation)
interface YtDlpFormat {
  url: string;
  format_id: string;
  ext: string;
  acodec: string;
  vcodec: string;
  abr?: number; // Average audio bitrate in kbps
  asr?: number; // Audio sampling rate in Hz
  tbr?: number; // Total bitrate (audio + video)
  vbr?: number; // Video bitrate
  filesize?: number;
  format_note?: string;
  loudness?: number; // Audio loudness in dB
  quality?: number; // Format quality rating
  width?: number;
  height?: number;
  fps?: number;
}

// Yt-dlp video info interface (based on yt-dlp JSON output structure)
interface YtDlpVideoInfoResponse {
  title: string;
  duration?: number; // Duration in seconds
  is_live?: boolean;
  live_status?: string; // 'is_live', 'was_live', 'not_live', etc.
  formats?: YtDlpFormat[];
  uploader?: string;
  upload_date?: string;
  view_count?: number;
  description?: string;
}

export interface YtDlpVideoFormat {
  url: string;
  itag?: number;
  format_id: string;
  ext: string;
  acodec: string;
  vcodec: string;
  abr?: number;
  asr?: number;
  filesize?: number;
  format_note?: string;
  container?: string;
  codecs?: string;
  audioSampleRate?: string;
  averageBitrate?: number;
  bitrate?: number;
  isLive?: boolean;
  loudnessDb?: number;
}

export interface YtDlpVideoInfo {
  videoDetails: {
    title: string;
    lengthSeconds: string;
    isLiveContent?: boolean;
  };
  formats: YtDlpVideoFormat[];
  player_response: {
    videoDetails: {
      isLiveContent: boolean;
    };
  };
}

class YtDlpCore {
  private readonly ytDlpWrap: YTDlpWrap;

  constructor() {
    this.ytDlpWrap = new YTDlpWrap();
  }

  async getInfo(url: string): Promise<YtDlpVideoInfo> {
    try {
      // Get video information using yt-dlp
      const videoInfo = await this.ytDlpWrap.getVideoInfo(url) as YtDlpVideoInfoResponse;

      // Transform yt-dlp format to ytdl-core compatible format
      const transformedFormats: YtDlpVideoFormat[] = (videoInfo.formats ?? []).map((format: YtDlpFormat) => ({
        url: format.url,
        // Note: yt-dlp doesn't provide itag directly, try to extract from format_id
        itag: this.extractItag(format.format_id),
        format_id: format.format_id,
        ext: format.ext,
        acodec: format.acodec ?? 'none',
        vcodec: format.vcodec ?? 'none',
        abr: format.abr, // Average audio bitrate (already in correct format)
        asr: format.asr, // Audio sample rate (already in correct format)
        filesize: format.filesize,
        format_note: format.format_note,
        container: this.getContainerFromExt(format.ext),
        codecs: this.getCodecsFromFormat(format),
        audioSampleRate: format.asr ? format.asr.toString() : undefined,
        averageBitrate: format.abr, // Map abr to averageBitrate for ytdl-core compatibility
        bitrate: format.tbr, // Map tbr (total bitrate) to bitrate
        isLive: this.isLiveVideo(videoInfo),
        loudnessDb: format.loudness,
      }));

      // Determine if this is live content
      const isLiveContent = this.isLiveVideo(videoInfo);

      return {
        videoDetails: {
          title: videoInfo.title,
          lengthSeconds: videoInfo.duration ? videoInfo.duration.toString() : '0',
          isLiveContent,
        },
        formats: transformedFormats,
        player_response: {
          videoDetails: {
            isLiveContent,
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to get video info: ${(error as Error).message}`);
    }
  }

  private extractItag(formatId: string): number | undefined {
    // Yt-dlp format_id might contain the itag for YouTube videos
    // For YouTube, format_id is often just the itag number
    // For other sites, it might be different, so we handle it gracefully
    if (/^\d+$/.test(formatId)) {
      return parseInt(formatId, 10);
    }

    // For non-numeric format IDs, we don't provide an itag
    return undefined;
  }

  private isLiveVideo(videoInfo: YtDlpVideoInfoResponse): boolean {
    // Check multiple indicators for live content
    return videoInfo.is_live === true
           || videoInfo.live_status === 'is_live'
           || (videoInfo.duration === undefined && videoInfo.is_live !== false);
  }

  private getContainerFromExt(ext: string): string {
    switch (ext.toLowerCase()) {
      case 'webm':
        return 'webm';
      case 'mp4':
        return 'mp4';
      case 'm4a':
        return 'm4a';
      case 'ogg':
        return 'ogg';
      case 'opus':
        return 'webm'; // Opus is typically in WebM container
      default:
        return ext ?? 'unknown';
    }
  }

  private getCodecsFromFormat(format: YtDlpFormat): string {
    const acodec = format.acodec && format.acodec !== 'none' ? format.acodec : null;
    const vcodec = format.vcodec && format.vcodec !== 'none' ? format.vcodec : null;

    if (acodec && vcodec) {
      return `${acodec}+${vcodec}`;
    }

    if (acodec) {
      return acodec;
    }

    if (vcodec) {
      return vcodec;
    }

    return 'unknown';
  }
}

// Create a singleton instance
const ytDlpCore = new YtDlpCore();

// Export functions that match ytdl-core interface
export const getInfo = async (url: string) => ytDlpCore.getInfo(url);

// Export types for compatibility
export type videoFormat = YtDlpVideoFormat;

// Default export
export default {
  getInfo: ytDlpCore.getInfo.bind(ytDlpCore),
};
