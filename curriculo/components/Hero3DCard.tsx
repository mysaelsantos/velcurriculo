import React, { useRef, useState } from 'react';

interface Hero3DCardProps {
    className?: string;
}

const Hero3DCard: React.FC<Hero3DCardProps> = ({ className = '' }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState('perspective(1000px) rotateX(5deg) rotateY(-10deg)');

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -8; // Max 8deg rotation
        const rotateY = ((x - centerX) / centerX) * 8;

        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
    };

    const handleMouseLeave = () => {
        // Reset to default angle
        setTransform('perspective(1000px) rotateX(5deg) rotateY(-10deg)');
    };

    return (
        <div
            ref={containerRef}
            className={`relative flex items-center justify-center ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: '1000px' }}
        >
            {/* Decorative Blobs */}
            <div className="absolute top-1/4 right-0 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-1/4 left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>

            {/* The Resume Card */}
            <div
                ref={cardRef}
                className="hero-3d-card animate-card-entrance relative w-[240px] md:w-[320px] lg:w-[360px] h-[320px] md:h-[460px] lg:h-[500px] bg-white backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl p-4 md:p-6 transition-transform duration-300 ease-out"
                style={{
                    transform,
                    transformStyle: 'preserve-3d',
                    boxShadow: '0 25px 50px -12px rgba(0, 79, 220, 0.15), 0 0 0 1px rgba(0, 79, 220, 0.05)'
                }}
            >
                {/* Glass Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 to-transparent rounded-2xl pointer-events-none"></div>

                {/* Resume Content Mockup */}
                <div className="h-full flex flex-col" style={{ transform: 'translateZ(20px)' }}>
                    {/* Header - Avatar + Name */}
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                        <div className="w-12 h-12 md:w-14 lg:w-16 md:h-14 lg:h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0"></div>
                        <div className="flex-1">
                            <div className="w-24 md:w-32 h-3 md:h-4 bg-gray-800 rounded mb-2"></div>
                            <div className="w-16 md:w-20 h-2 md:h-3 bg-gray-300 rounded"></div>
                        </div>
                    </div>

                    {/* Content Lines */}
                    <div className="space-y-3 md:space-y-4 flex-1">
                        <div className="w-full h-2 bg-gray-200 rounded"></div>
                        <div className="w-5/6 h-2 bg-gray-200 rounded"></div>
                        <div className="w-4/6 h-2 bg-gray-200 rounded"></div>

                        {/* Section Header */}
                        <div className="mt-6 md:mt-8 w-20 md:w-24 h-3 md:h-4 bg-blue-100 rounded mb-2"></div>

                        {/* Experience Cards */}
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                            <div className="h-16 md:h-20 bg-gray-50 rounded-lg border border-gray-100"></div>
                            <div className="h-16 md:h-20 bg-gray-50 rounded-lg border border-gray-100"></div>
                        </div>
                    </div>

                    {/* Floating Badge - ATS Score */}
                    <div
                        className="absolute -right-4 md:-right-6 lg:-right-8 top-16 md:top-20 bg-white border border-green-200 p-2 md:p-3 rounded-xl shadow-xl flex items-center gap-2 md:gap-3 animate-float"
                        style={{ transform: 'translateZ(40px)' }}
                    >
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-[10px] md:text-xs text-gray-500">ATS Score</div>
                            <div className="text-xs md:text-sm font-bold text-gray-800">98/100</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hero3DCard;
