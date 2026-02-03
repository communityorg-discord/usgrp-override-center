import React, { useEffect, useRef, useMemo } from 'react';

// Particle configuration
const PARTICLE_COUNT = 50;
const PARTICLE_COLORS = [
    'rgba(212, 175, 55, 0.3)',   // Gold
    'rgba(212, 175, 55, 0.15)',  // Gold faint
    'rgba(255, 255, 255, 0.1)',  // White
    'rgba(147, 112, 219, 0.2)',  // Purple
];

function Particle(canvas) {
    this.canvas = canvas;
    this.reset();
}

Particle.prototype.reset = function() {
    this.x = Math.random() * this.canvas.width;
    this.y = Math.random() * this.canvas.height;
    this.size = Math.random() * 2 + 0.5;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.speedY = (Math.random() - 0.5) * 0.3;
    this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    this.opacity = Math.random() * 0.5 + 0.2;
    this.pulse = Math.random() * Math.PI * 2;
    this.pulseSpeed = Math.random() * 0.02 + 0.01;
};

Particle.prototype.update = function() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.pulse += this.pulseSpeed;
    
    // Wrap around edges
    if (this.x < 0) this.x = this.canvas.width;
    if (this.x > this.canvas.width) this.x = 0;
    if (this.y < 0) this.y = this.canvas.height;
    if (this.y > this.canvas.height) this.y = 0;
};

Particle.prototype.draw = function(ctx) {
    const pulseOpacity = this.opacity * (0.5 + Math.sin(this.pulse) * 0.5);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace(/[\d.]+\)$/, `${pulseOpacity})`);
    ctx.fill();
};

export default function AnimatedBackground({ enabled = true, intensity = 'low' }) {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const animationRef = useRef(null);
    
    const particleCount = useMemo(() => {
        switch (intensity) {
            case 'high': return 100;
            case 'medium': return 75;
            case 'low': 
            default: return PARTICLE_COUNT;
        }
    }, [intensity]);

    useEffect(() => {
        if (!enabled) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);
        
        // Initialize particles
        particlesRef.current = [];
        for (let i = 0; i < particleCount; i++) {
            particlesRef.current.push(new Particle(canvas));
        }
        
        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw connecting lines between nearby particles
            for (let i = 0; i < particlesRef.current.length; i++) {
                for (let j = i + 1; j < particlesRef.current.length; j++) {
                    const dx = particlesRef.current[i].x - particlesRef.current[j].x;
                    const dy = particlesRef.current[i].y - particlesRef.current[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 150) {
                        ctx.beginPath();
                        ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y);
                        ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y);
                        ctx.strokeStyle = `rgba(212, 175, 55, ${0.05 * (1 - distance / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            
            // Update and draw particles
            particlesRef.current.forEach(particle => {
                particle.update();
                particle.draw(ctx);
            });
            
            animationRef.current = requestAnimationFrame(animate);
        };
        
        animate();
        
        return () => {
            window.removeEventListener('resize', resize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [enabled, particleCount]);

    if (!enabled) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ opacity: 0.6 }}
        />
    );
}
