import YTDlpWrap from 'yt-dlp-wrap';

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
  private ytDlpWrap: YTDlpWrap;

  constructor() {
    this.ytDlpWrap = new YTDlpWrap();
  }

  async getInfo(url: string): Promise<YtDlpVideoInfo> {
    try {
      // Get video information using yt-dlp
      const videoInfo = await this.ytDlpWrap.getVideoInfo(url);
      
      // Transform yt-dlp format to ytdl-core compatible format
      const transformedFormats: YtDlpVideoFormat[] = (videoInfo.formats || []).map((format: any) => ({
        url: format.url,
        itag: format.format_id ? parseInt(format.format_id, 10) : undefined,
        format_id: format.format_id,
        ext: format.ext,
        acodec: format.acodec,
        vcodec: format.vcodec,
        abr: format.abr,
        asr: format.asr,
        filesize: format.filesize,
        format_note: format.format_note,
        container: this.getContainerFromExt(format.ext),
        codecs: this.getCodecsFromFormat(format),
        audioSampleRate: format.asr ? format.asr.toString() : undefined,
        averageBitrate: format.abr,
        bitrate: format.tbr,
        isLive: videoInfo.is_live || false,
        loudnessDb: format.loudness,
      }));

      return {
        videoDetails: {
          title: videoInfo.title,
          lengthSeconds: videoInfo.duration ? videoInfo.duration.toString() : '0',
          isLiveContent: videoInfo.is_live || false,
        },
        formats: transformedFormats,
        player_response: {
          videoDetails: {
            isLiveContent: videoInfo.is_live || false,
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to get video info: ${(error as Error).message}`);
    }
  }

  private getContainerFromExt(ext: string): string {
    switch (ext) {
      case 'webm':
        return 'webm';
      case 'mp4':
        return 'mp4';
      case 'm4a':
        return 'm4a';
      default:
        return ext || 'unknown';
    }
  }

  private getCodecsFromFormat(format: any): string {
    if (format.acodec && format.acodec !== 'none') {
      if (format.vcodec && format.vcodec !== 'none') {
        return `${format.acodec}+${format.vcodec}`;
      }

      return format.acodec;
    }

    if (format.vcodec && format.vcodec !== 'none') {
      return format.vcodec;
    }

    return 'unknown';
  }
}

// Create a singleton instance
const ytDlpCore = new YtDlpCore();

// Export functions that match ytdl-core interface
export const getInfo = (url: string) => ytDlpCore.getInfo(url);

// Export types for compatibility
export type videoFormat = YtDlpVideoFormat;

// Default export
export default {
  getInfo: ytDlpCore.getInfo.bind(ytDlpCore),
};