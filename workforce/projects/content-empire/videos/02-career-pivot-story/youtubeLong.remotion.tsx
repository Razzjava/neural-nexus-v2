import { Composition, Series, interpolate, useCurrentFrame, Easing } from 'remotion';

// Viral video pattern: youtubeLong
// Optimal duration: 480s
// Structure: hook → intro → content → proof → cta



const youtubeLongVideo = () => {
  return (
    <Series>
      
      <Series.Sequence durationInFrames={1350}>
        <FlashText 
          text="5 years. Senior Pega developer. CSSA certified. Making well into 6 figures with job security most pe..."
          
          
          
          
          
          
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
    title: "5 years as a certified senior Pega developer. $100K+ salary. I walked away from it all to become a YouTuber. Here's why—and what happened next.",
    format: "youtubeLong"
  }
};

export default youtubeLongVideo;
