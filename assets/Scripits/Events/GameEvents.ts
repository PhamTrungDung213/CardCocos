import { EventTarget } from 'cc';

/**
 * Trạm phát thanh sự kiện trung tâm (Observer Pattern)
 * Cho phép các hệ thống giao tiếp mà không phụ thuộc trực tiếp vào nhau.
 */
export const EventBus = new EventTarget();

/**
 * Danh mục toàn bộ các sự kiện trong game
 */
export enum GameEvent {
    // --- THẺ BÀI ---
    CARD_DRAWN = 'CARD_DRAWN',                         // Rút 1 lá bài về tay
    CARD_PLAYED_TO_SLOT = 'CARD_PLAYED_TO_SLOT',       // Đặt 1 lá bài vào Slot
    CARD_RETURNED_TO_HAND = 'CARD_RETURNED_TO_HAND',   // Rút 1 lá bài từ Slot về lại tay
    CARD_DISCARDED = 'CARD_DISCARDED',                 // Lá bài bị hủy vào Discard
    CARD_EXECUTED = 'CARD_EXECUTED',                   // Lá bài vừa kích hoạt hiệu ứng (đánh/hồi máu/rút)
    DECK_RELOADED = 'DECK_RELOADED',                   // Deck đã được nạp lại bài từ Discard

    // --- TRẬN ĐẤU & TRẠNG THÁI (STATE) ---
    GAME_STATE_CHANGED = 'GAME_STATE_CHANGED',         // Trạng thái trận đấu thay đổi
    END_TURN_CLICKED = 'END_TURN_CLICKED',             // Người chơi bấm nút Kết thúc lượt
    ROUND_START = 'ROUND_START',                       // Bắt đầu hiệp mới
    SLOT_RESOLVE_START = 'SLOT_RESOLVE_START',         // Bắt đầu kích hoạt chuỗi bài trong Slot
    SLOT_RESOLVE_END = 'SLOT_RESOLVE_END',             // Kích hoạt xong chuỗi bài trong Slot
    ENEMY_TURN_START = 'ENEMY_TURN_START',             // Lượt quái tấn công
    ENEMY_TURN_END = 'ENEMY_TURN_END',                 // Lượt quái kết thúc
    VICTORY = 'VICTORY',                               // Người chơi thắng
    GAME_OVER = 'GAME_OVER',                           // Người chơi thua

    // --- NGƯỜI CHƠI ---
    PLAYER_HP_CHANGED = 'PLAYER_HP_CHANGED',           // Máu người chơi thay đổi
    PLAYER_TOOK_DAMAGE = 'PLAYER_TOOK_DAMAGE',         // Người chơi nhận sát thương
    PLAYER_HEALED = 'PLAYER_HEALED',                   // Người chơi được hồi máu
    PLAYER_DIED = 'PLAYER_DIED',                       // Người chơi hết máu
    PLAYER_MANA_CHANGED = 'PLAYER_MANA_CHANGED',       // Mana người chơi thay đổi
    PLAYER_NOT_ENOUGH_MANA = 'PLAYER_NOT_ENOUGH_MANA', // Người chơi không đủ mana

    // --- QUÁI VẬT ---
    ENEMY_DAMAGED = 'ENEMY_DAMAGED',                   // Quái bị dính đòn
    ENEMY_DEFEATED = 'ENEMY_DEFEATED',                 // 1 con quái chết
    ALL_ENEMIES_DEFEATED = 'ALL_ENEMIES_DEFEATED',     // Toàn bộ quái trên sân bị tiêu diệt
}
