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
  readonly y: number;
};

type HeartsOverlayProps = {
  readonly onAnimationComplete: () => void;
  readonly visible: boolean;
};

const HEART_COUNT = 30;
const ANIMATION_DURATION = 3000;
const HALF = 0.5;
const SCREEN_HEIGHT_OFFSET = 100;
const ANIMATION_DURATION_OFFSET_600 = 600;
const ANIMATION_DURATION_OFFSET_400 = 400;
const ANIMATION_INITIAL_DURATION = 200;
const ANIMATION_EASE_IN_DURATION = 300;
const SCALE_MAX = 1.2;
const SCALE_MIN = 0.8;
const SINE_WAVE_DIVISOR = 50;
const SINE_WAVE_AMPLITUDE = 50;
const ROTATION_RANGE = 60;

function FloatingHeart({ rotation, x, y }: Omit<HeartAnimation, 'id'>) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(HALF);

  useEffect(() => {
    translateY.value = withTiming(-SCREEN_HEIGHT - SCREEN_HEIGHT_OFFSET, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
    });
    opacity.value = withSequence(
      withTiming(1, { duration: ANIMATION_INITIAL_DURATION }),
      withTiming(1, {
        duration: ANIMATION_DURATION - ANIMATION_DURATION_OFFSET_600,
      }),
      withTiming(0, { duration: ANIMATION_DURATION_OFFSET_400 }),
    );
    scale.value = withSequence(
      withTiming(1, {
        duration: ANIMATION_EASE_IN_DURATION,
        easing: Easing.out(Easing.ease),
      }),
      withTiming(SCALE_MAX, {
        duration: ANIMATION_DURATION - ANIMATION_DURATION_OFFSET_400,
      }),
      withTiming(SCALE_MIN, { duration: ANIMATION_EASE_IN_DURATION }),
    );
  }, [opacity, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      {
        translateX:
          Math.sin(translateY.value / SINE_WAVE_DIVISOR) * SINE_WAVE_AMPLITUDE,
      },
      { rotate: `${rotation}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.Text
      style={[
        {
          fontSize: 24,
          left: x,
          position: 'absolute',
          top: y,
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
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, ANIMATION_DURATION);
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
      y: Math.random() * SCREEN_HEIGHT,
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
          y={heart.y}
        />
      ))}
    </GestureHandlerRootView>
  );
}

export default HeartsOverlay;
