'use client'
import { motion, type Variants } from 'framer-motion';

interface ImageRevealProps {
    images: string[];
}

export default function ImageReveal({ images }: ImageRevealProps) {
    if (!images || images.length < 5) return null;

    const containerVariants: Variants = {
        initial: { opacity: 0 },
        animate: {
            opacity: 1,
            transition: {
                delay: 0.1,
                staggerChildren: 0.1,
            }
        }
    };

    // Far Left
    const farLeftVariants: Variants = {
        initial: { rotate: 0, x: 0, y: 0 },
        animate: {
            rotate: -14,
            x: -240,
            y: 18,
            transition: { type: "spring", stiffness: 120, damping: 12 }
        },
        hover: {
            rotate: -3,
            x: -260,
            y: 0,
            transition: { type: "spring", stiffness: 200, damping: 15 }
        }
    };

    // Left
    const leftVariants: Variants = {
        initial: { rotate: 0, x: 0, y: 0 },
        animate: {
            rotate: -7,
            x: -120,
            y: 6,
            transition: { type: "spring", stiffness: 120, damping: 12 }
        },
        hover: {
            rotate: 0,
            x: -130,
            y: -8,
            transition: { type: "spring", stiffness: 200, damping: 15 }
        }
    };

    // Middle
    const middleVariants: Variants = {
        initial: { rotate: 0, x: 0, y: 0 },
        animate: {
            rotate: 0,
            x: 0,
            y: 0,
            transition: { type: "spring", stiffness: 120, damping: 12 }
        },
        hover: {
            rotate: 0,
            x: 0,
            y: -20,
            transition: { type: "spring", stiffness: 200, damping: 15 }
        }
    };

    // Right
    const rightVariants: Variants = {
        initial: { rotate: 0, x: 0, y: 0 },
        animate: {
            rotate: 7,
            x: 120,
            y: 6,
            transition: { type: "spring", stiffness: 120, damping: 12 }
        },
        hover: {
            rotate: 0,
            x: 130,
            y: -8,
            transition: { type: "spring", stiffness: 200, damping: 15 }
        }
    };

    // Far Right
    const farRightVariants: Variants = {
        initial: { rotate: 0, x: 0, y: 0 },
        animate: {
            rotate: 14,
            x: 240,
            y: 18,
            transition: { type: "spring", stiffness: 120, damping: 12 }
        },
        hover: {
            rotate: 3,
            x: 260,
            y: 0,
            transition: { type: "spring", stiffness: 200, damping: 15 }
        }
    };

    const variantsMap = [farLeftVariants, leftVariants, middleVariants, rightVariants, farRightVariants];
    const zIndexes = [50, 40, 30, 20, 10]; // Stack depth

    return (
        <motion.div
            className="relative flex items-center justify-center w-full h-80 my-10"
            variants={containerVariants}
            initial="initial"
            animate="animate"
        >
            {images.slice(0, 5).map((url, idx) => (
                <motion.div
                    key={idx}
                    className="absolute w-44 h-44 overflow-hidden rounded-2xl shadow-xl bg-white border border-zinc-200 p-2 cursor-pointer transition-shadow hover:shadow-2xl"
                    variants={variantsMap[idx]}
                    whileHover="hover"
                    animate="animate"
                    style={{ zIndex: zIndexes[idx] }}
                >
                    <img
                        src={url}
                        alt={`Instagram post ${idx + 1}`}
                        className="w-full h-full object-cover rounded-xl"
                    />
                </motion.div>
            ))}
        </motion.div>
    );
}
