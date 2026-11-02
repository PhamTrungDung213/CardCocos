import { CardType, CardTargetType, ICardConfig } from './CardData';

export const CARD_DATABASE: Record<string, ICardConfig> = {
    // ================= 1. NHÓM TẤN CÔNG (Dùng CardATK Prefab) =================
    "ATK_STRIKE": {
        id: "ATK_STRIKE",
        name: "STRIKE",
        type: CardType.ATK,
        targetType: CardTargetType.SINGLE_ENEMY,
        manaCost: 1,
        value: 20 // Cân bằng: Tăng lên 20 sát thương
    },
    "ATK_HEAVY": {
        id: "ATK_HEAVY",
        name: "HEAVY SMASH",
        type: CardType.ATK,
        targetType: CardTargetType.SINGLE_ENEMY,
        manaCost: 2,
        value: 38 // Cân bằng: Tăng lên 38 sát thương
    },
    "ATK_MULTI": {
        id: "ATK_MULTI",
        name: "MULTI SHOT",
        type: CardType.ATK,
        targetType: CardTargetType.RANDOM_ENEMY,
        targetCount: 2,
        manaCost: 1,
        value: 16 // Cân bằng: 16 sát thương mỗi phát bắn (tổng 32)
    },
    "ATK_CLEAVE": {
        id: "ATK_CLEAVE",
        name: "CLEAVE",
        type: CardType.ATK,
        targetType: CardTargetType.ALL_ENEMIES,
        manaCost: 2,
        value: 22 // Cân bằng: 22 sát thương lên toàn bộ quái
    },

    // ================= 2. NHÓM HỒI MÁU (Dùng CardHEAL Prefab) =================
    "HEAL_FIRST_AID": {
        id: "HEAL_FIRST_AID",
        name: "FIRST AID",
        type: CardType.HEAL,
        targetType: CardTargetType.SELF,
        manaCost: 1,
        value: 18 // Cân bằng: Hồi 18 HP
    },
    "HEAL_POTION": {
        id: "HEAL_POTION",
        name: "POTION",
        type: CardType.HEAL,
        targetType: CardTargetType.SELF,
        manaCost: 2,
        value: 35 // Cân bằng: Hồi 35 HP
    },

    // ================= 3. NHÓM RÚT BÀI (Dùng CardDRAW Prefab) =================
    "DRAW_FOCUS": {
        id: "DRAW_FOCUS",
        name: "FOCUS",
        type: CardType.DRAW,
        targetType: CardTargetType.NONE,
        manaCost: 1,
        value: 2
    },
    "DRAW_CYCLE": {
        id: "DRAW_CYCLE",
        name: "CYCLE",
        type: CardType.DRAW,
        targetType: CardTargetType.NONE,
        manaCost: 0,
        value: 1
    }
};

export const ATK_CARD_IDS = ["ATK_STRIKE", "ATK_HEAVY", "ATK_MULTI", "ATK_CLEAVE"];
export const HEAL_CARD_IDS = ["HEAL_FIRST_AID", "HEAL_POTION"];
export const DRAW_CARD_IDS = ["DRAW_FOCUS", "DRAW_CYCLE"];

/**
 * Sinh bộ bài ban đầu gồm:
 * - 5 lá ATK (ngẫu nhiên trong nhóm ATK)
 * - 5 lá HEAL (ngẫu nhiên trong nhóm HEAL)
 * - 5 lá DRAW (ngẫu nhiên trong nhóm DRAW)
 * Toàn bộ 15 lá sau đó được TRỘN ĐỀU (Shuffle) trước khi nạp vào Deck.
 */
export function generateRandomStarterDeck(): string[] {
    const deck: string[] = [];

    // 1. Lấy 5 lá ATK ngẫu nhiên
    for (let i = 0; i < 5; i++) {
        const randIdx = Math.floor(Math.random() * ATK_CARD_IDS.length);
        deck.push(ATK_CARD_IDS[randIdx]);
    }

    // 2. Lấy 5 lá HEAL ngẫu nhiên
    for (let i = 0; i < 5; i++) {
        const randIdx = Math.floor(Math.random() * HEAL_CARD_IDS.length);
        deck.push(HEAL_CARD_IDS[randIdx]);
    }

    // 3. Lấy 5 lá DRAW ngẫu nhiên
    for (let i = 0; i < 5; i++) {
        const randIdx = Math.floor(Math.random() * DRAW_CARD_IDS.length);
        deck.push(DRAW_CARD_IDS[randIdx]);
    }

    // 4. Trộn bài ngẫu nhiên (Fisher-Yates Shuffle Algorithm)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
    }

    return deck;
}
