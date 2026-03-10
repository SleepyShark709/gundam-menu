import { useEffect, useState, useCallback } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions, Engine } from '@tsparticles/engine';
import styles from './styles.module.css';

const particleOptions: ISourceOptions = {
  fpsLimit: 60,
  particles: {
    number: {
      value: 40,
      density: {
        enable: true,
      },
    },
    color: {
      value: '#00d4ff',
    },
    opacity: {
      value: 0.3,
      animation: {
        enable: true,
        speed: 0.5,
        sync: false,
      },
    },
    size: {
      value: { min: 1, max: 3 },
    },
    links: {
      enable: true,
      color: '#00d4ff',
      opacity: 0.15,
      distance: 120,
      width: 1,
    },
    move: {
      enable: true,
      speed: 0.8,
      direction: 'none' as const,
      random: true,
      straight: false,
      outModes: {
        default: 'bounce' as const,
      },
    },
  },
  interactivity: {
    events: {
      onHover: {
        enable: true,
        mode: 'grab',
      },
      onClick: {
        enable: true,
        mode: 'push',
      },
    },
    modes: {
      grab: {
        distance: 150,
        links: {
          opacity: 0.5,
        },
      },
      push: {
        quantity: 2,
      },
      repulse: {
        distance: 80,
        duration: 0.4,
      },
    },
  },
  detectRetina: true,
  background: {
    color: 'transparent',
  },
};

export default function ParticleBackground() {
  const [engineReady, setEngineReady] = useState(false);

  const initEngine = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
    setEngineReady(true);
  }, []);

  useEffect(() => {
    initParticlesEngine(initEngine).catch(console.error);
  }, [initEngine]);

  if (!engineReady) return null;

  return (
    <div className={styles.container}>
      <Particles
        id="gundam-particles"
        options={particleOptions}
        className={styles.particles}
      />
    </div>
  );
}
