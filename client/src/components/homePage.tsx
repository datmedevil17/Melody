import React from 'react';
import { ArrowRight } from 'lucide-react';
import ArtistSlider from './gallery';

const ReluxeLanding: React.FC = () => {
    const features = [
        {
            title: 'Opportunity to create your own unique profile',
            image: 'https://picsum.photos/seed/reluxe1/400/300',
        },
        {
            title: 'Support and feedback from the music community',
            image: 'https://picsum.photos/seed/reluxe2/400/300',
        },
        {
            title: 'Guaranteed payouts for every track played',
            image: 'https://picsum.photos/seed/reluxe3/400/300',
        },
    ];

    return (
        <>
        <div className="bg-black text-white min-h-screen px-6 py-6 font-sans">

            {/* Hero Section */}
            <section className="relative flex flex-col md:flex-row justify-center items-center gap-12 mb-20">
                {/* Connecting lines */}
                <div className="absolute w-full max-w-3xl h-1 top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-0 hidden md:block">
                    <div className="absolute w-1/3 left-0 top-1/2 border-t border-yellow-400" />
                    <div className="absolute w-1/3 left-1/3 top-1/2 border-t border-yellow-400" />
                </div>

                {/* Circles */}
                <div className="relative z-10 w-64 h-64 bg-yellow-400 rounded-full flex items-center justify-center text-center px-6 shadow-xl">
                    <p className="text-sm font-semibold text-black">
                        The platform helps aspiring artists bring their music to the audience
                    </p>
                </div>

                <div className="relative z-10 w-64 h-64 bg-white rounded-full flex items-center justify-center text-5xl font-bold text-black shadow-2xl border-4 border-yellow-400">
                    Melody
                </div>

                <div className="relative z-10 w-64 h-64 rounded-full overflow-hidden shadow-2xl border-4 border-white">
                    <img
                        src="https://picsum.photos/seed/reluxe-hero/400/400"
                        alt="Artist"
                        className="object-cover w-full h-full"
                    />
                    <button className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-1.5 rounded-full flex items-center gap-2 hover:bg-yellow-400 transition text-sm font-medium">
                        Learn More <ArrowRight size={16} />
                    </button>
                </div>
            </section>

            {/* Feature Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {features.map((feature, idx) => (
                    <div
                        key={idx}
                        className="bg-zinc-900 rounded-xl overflow-hidden shadow-md hover:scale-[1.02] transition"
                    >
                        <div className="relative h-48 overflow-hidden">
                            <img
                                src={feature.image}
                                alt="Feature"
                                className="object-cover w-full h-full transform transition duration-300 hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        </div>
                        <div className="p-4 flex flex-col justify-between h-36">
                            <p className="font-medium text-sm leading-relaxed mb-4">
                                {feature.title}
                            </p>
                            <button className="border border-white px-4 py-1 rounded-full w-fit text-sm hover:bg-white hover:text-black transition">
                                Explore
                            </button>
                        </div>
                    </div>
                ))}
            </section>
        </div>
        <ArtistSlider />
        </>
    );
};

export default ReluxeLanding;
