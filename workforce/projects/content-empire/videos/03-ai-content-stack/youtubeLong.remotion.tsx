import { Composition, Series, interpolate, useCurrentFrame, Easing } from 'remotion';

// Viral video pattern: youtubeLong
// Optimal duration: 480s
// Structure: hook → intro → content → proof → cta



const youtubeLongVideo = () => {
  return (
    <Series>
      
      <Series.Sequence durationInFrames={1350}>
        <FlashText 
          text="In 2023, creating a single YouTube video took me 20+ hours. Research, scripting, filming, editing, t..."
          
          
          
          
          
          
        />
      </Series.Sequence>
      
    </Series>
  );
};

export const youtubeLongComposition = {
  id: 'youtubeLong-video',
  component: youtubeLongVideo,
  durationInFrames: 1350,
  fps: 30,
  width: 1920,
  height: 1080,
  defaultProps: {
    // Script data
    title: "I went from spending 20 hours per video to 4 hours—without sacrificing quality. Here's the AI content stack that made it possible.",
    format: "youtubeLong"
  }
};

export default youtubeLongVideo;
