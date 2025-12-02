import { useEffect } from 'react';
import { Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

type HeartAnimation = {
  readonly id: string;
  readonly rotation: number;
  readonly x: number;
  readonly delay: number;
};

type HeartsOverlayProps = {
  readonly onAnimationComplete: () => void;
  readonly visible: boolean;
};

const HEART_COUNT = 100;
const ANIMATION_DURATION = 4000;
const HALF = 0.5;
const SCREEN_HEIGHT_OFFSET = 100;
const SCALE_MAX = 1.2;
const SCALE_MIN = 0.6;
const SINE_WAVE_DIVISOR = 40;
const SINE_WAVE_AMPLITUDE = 40;
const ROTATION_RANGE = 80;
const MAX_STAGGER_DELAY = 2000;
const OPACITY_FADE_START = 0.3;

function FloatingHeart({ rotation, x, delay }: Omit<HeartAnimation, 'id'>) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(SCALE_MIN);

  useEffect(() => {
    // Staggered start with delay
    const timer = setTimeout(() => {
      translateY.value = withTiming(-SCREEN_HEIGHT - SCREEN_HEIGHT_OFFSET, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.quad),
      });
      
      scale.value = withSequence(
        withTiming(1, {
          duration: 300,
          easing: Easing.out(Easing.back(1.5)),
        }),
        withTiming(SCALE_MAX, {
          duration: ANIMATION_DURATION - 600,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(SCALE_MIN, { 
          duration: 300,
          easing: Easing.in(Easing.ease),
        }),
      );
      
      opacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [opacity, scale, translateY, delay]);

  const animatedStyle = useAnimatedStyle(() => {
    // Calculate opacity based on vertical position (fade from bottom to top)
    const progress = Math.abs(translateY.value) / (SCREEN_HEIGHT + SCREEN_HEIGHT_OFFSET);
    const fadeOpacity = progress < OPACITY_FADE_START 
      ? 1 
      : 1 - ((progress - OPACITY_FADE_START) / (1 - OPACITY_FADE_START));
    
    return {
      opacity: opacity.value * fadeOpacity,
      transform: [
        { translateY: translateY.value },
        {
          translateX:
            Math.sin(translateY.value / SINE_WAVE_DIVISOR) * SINE_WAVE_AMPLITUDE,
        },
        { rotate: `${rotation}deg` },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.Text
      style={[
        {
          fontSize: 24,
          left: x,
          position: 'absolute',
          top: SCREEN_HEIGHT + 20,
        },
        animatedStyle,
      ]}
    >
      ❤️
    </Animated.Text>
  );
}

function HeartsOverlay({ onAnimationComplete, visible }: HeartsOverlayProps) {
  useEffect(() => {
    if (visible) {
      // Total animation time = max stagger delay + animation duration
      const totalDuration = MAX_STAGGER_DELAY + ANIMATION_DURATION;
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, totalDuration);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [onAnimationComplete, visible]);

  if (!visible) {
    return undefined;
  }

  const hearts: HeartAnimation[] = Array.from(
    { length: HEART_COUNT },
    (_, index) => ({
      id: `heart-${index}`,
      rotation: (Math.random() - HALF) * ROTATION_RANGE,
      x: Math.random() * SCREEN_WIDTH,
      // Stagger the start time of each heart
      delay: Math.random() * MAX_STAGGER_DELAY,
    }),
  );

  return (
    <GestureHandlerRootView
      style={{
        bottom: 0,
        left: 0,
        pointerEvents: 'none',
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 9999,
      }}
    >
      {hearts.map((heart) => (
        <FloatingHeart
          key={heart.id}
          rotation={heart.rotation}
          x={heart.x}
          delay={heart.delay}
        />
      ))}
    </GestureHandlerRootView>
  );
}

export default HeartsOverlay;
