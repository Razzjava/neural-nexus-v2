import { Composition, Series, interpolate, useCurrentFrame, Easing } from 'remotion';

// Viral video pattern: youtubeLong
// Optimal duration: 480s
// Structure: hook → intro → content → proof → cta



const youtubeLongVideo = () => {
  return (
    <Series>
      
      <Series.Sequence durationInFrames={900}>
        <FlashText 
          text="26% of jobs posted on Indeed could be highly transformed by AI this year. That's not my opinion—that..."
          
          
          
          
          
          
        />
      </Series.Sequence>
      
    </Series>
  );
};

export const youtubeLongComposition = {
  id: 'youtubeLong-video',
  component: youtubeLongVideo,
  durationInFrames: 900,
  fps: 30,
  width: 1920,
  height: 1080,
  defaultProps: {
    // Script data
    title: "26% of all jobs are about to be transformed by AI. But here's what the headlines won't tell you...",
    format: "youtubeLong"
  }
};

export default youtubeLongVideo;
