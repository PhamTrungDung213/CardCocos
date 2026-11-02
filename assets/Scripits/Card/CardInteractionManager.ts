import { _decorator, Component, Node, Vec3, Vec2, UITransform } from 'cc';
import { CardCtrl } from './CardCtrl';
import { CardManager } from './CardManager';
import { CardSpawnManager } from './CardSpawnManager';
import { LevelState } from '../System/LevelState';
import { PlayerManager } from './PlayerManager';
const { ccclass, property } = _decorator;

@ccclass('CardInteractionManager')
export class CardInteractionManager extends Component {
    public static instance: CardInteractionManager | null = null;

    @property({ type: Node, tooltip: 'Kéo node DragLayer vào đây' })
    public dragLayerNode: Node = null!;

    @property({ type: Node, tooltip: 'Kéo node PlayZone vào đây' })
    public playZoneNode: Node = null!;

    @property({ type: Node, tooltip: 'Kéo node DiscardZone vào đây' })
    public discardNode: Node = null!;

    @property({ type: [Node], tooltip: 'Kéo 3 node ô bài vào đây: Slot1, Slot2, Slot3' })
    public slotNodes: Node[] = [];

    @property({ tooltip: 'Hệ số phóng to khi nhấc lá bài lên kéo' })
    public dragScaleFactor: number = 1.15;

    onLoad() {
        CardInteractionManager.instance = this;
    }

    onDestroy() {
        if (CardInteractionManager.instance === this) {
            CardInteractionManager.instance = null;
        }
    }

    // =========================================================================
    // 1. KIỂM TRA ĐIỀU KIỆN ĐƯỢC PHÉP KÉO THẢ
    // =========================================================================

    /**
     * Xác định xem lá bài có đủ điều kiện để nhấc lên kéo thả hay không:
     * - Đang trong lượt người chơi (PLAYER_TURN)
     * - KHÔNG nằm trong Deck (chặn người chơi tác động vào Deck)
     * - Phải đang ở trên tay người chơi HOẶC đang nằm trong ô Slot
     */
    public canStartDrag(cardCtrl: CardCtrl): boolean {
        // 0. Nếu đang không phải lượt người chơi -> Khóa kéo thả
        if (LevelState.instance && !LevelState.instance.isPlayerTurn()) {
            return false;
        }

        const cardManager = CardManager.instance;
        if (!cardManager) return false;

        // 1. Chặn hoàn toàn: Người chơi không được tác động trực tiếp vào bài trên Deck
        if (CardSpawnManager.instance && CardSpawnManager.instance.isCardInDeck(cardCtrl)) {
            return false;
        }

        // 2. Cho phép kéo nếu bài nằm trên tay hoặc trong Slot
        const inHand = cardManager.handCards.indexOf(cardCtrl) !== -1;
        const inSlot = cardManager.getCardSlotIndex(cardCtrl) !== -1;

        return inHand || inSlot;
    }

    // =========================================================================
    // 2. BẮT ĐẦU KÉO THẺ BÀI (START DRAG)
    // =========================================================================

    /**
     * Nhấc thẻ bài lên DragLayer, phóng to và chuẩn bị di chuyển
     */
    public startDrag(cardCtrl: CardCtrl): { inHandIndex: number; inSlotIndex: number } {
        const cardManager = CardManager.instance;
        const inHandIndex = cardManager ? cardManager.handCards.indexOf(cardCtrl) : -1;
        const inSlotIndex = cardManager ? cardManager.getCardSlotIndex(cardCtrl) : -1;

        cardCtrl.isDragging = true;

        // Lưu vị trí thế giới để khi chuyển sang DragLayer không bị giật vị trí
        const currentWorldPos = cardCtrl.node.worldPosition.clone();

        // Chuyển sang dragLayerNode để nổi lên trên cùng màn hình
        if (this.dragLayerNode) {
            cardCtrl.node.setParent(this.dragLayerNode);
            cardCtrl.node.setWorldPosition(currentWorldPos);
        } else if (cardCtrl.node.parent) {
            cardCtrl.node.setSiblingIndex(cardCtrl.node.parent.children.length - 1);
        }

        // Phóng to nhẹ về kích thước cầm bài trên tay để người chơi dễ quan sát
        const baseScale = cardManager ? cardManager.cardScale : 0.68;
        const dragScale = baseScale * this.dragScaleFactor;
        cardCtrl.node.setScale(new Vec3(dragScale, dragScale, 1));

        // Báo cho CardManager cập nhật dữ liệu nguồn bài
        if (inHandIndex !== -1 && cardManager) {
            cardManager.onCardStartDrag(cardCtrl);
        } else if (inSlotIndex !== -1 && cardManager) {
            cardManager.onSlotCardStartDrag(cardCtrl, inSlotIndex);
        }

        return { inHandIndex, inSlotIndex };
    }

    // =========================================================================
    // 3. DI CHUYỂN THẺ BÀI THEO NGÓN TAY (DRAG MOVE)
    // =========================================================================

    /**
     * Cập nhật vị trí thẻ bài bám theo ngón tay người chơi
     */
    public dragMove(cardCtrl: CardCtrl, touchUILocation: Vec2): void {
        const targetParent = this.dragLayerNode || CardManager.instance?.cardHoldNode;
        if (!targetParent) return;

        const trans = targetParent.getComponent(UITransform);
        if (trans) {
            const localPos = new Vec3();
            trans.convertToNodeSpaceAR(new Vec3(touchUILocation.x, touchUILocation.y, 0), localPos);
            cardCtrl.node.setPosition(localPos);
        }
    }

    // =========================================================================
    // 4. THẢ THẺ BÀI & PHÂN TÍCH VÙNG RƠI (END DRAG & DROP RESOLUTION)
    // =========================================================================

    /**
     * Phân tích tọa độ thả bài xem trúng Slot, Discard, hay Hand rồi điều phối sang CardManager
     * Kết hợp kiểm tra tiêu tốn Mana và hoàn Mana
     */
    public endDrag(cardCtrl: CardCtrl, originalHandIndex: number, fromSlotIndex: number = -1): void {
        cardCtrl.isDragging = false;
        const cardManager = CardManager.instance;
        if (!cardManager) return;

        const playerMana = PlayerManager.instance;
        const cardCost = cardCtrl.manaCost;

        // ---------------------------------------------------------------------
        // 1. Thả trúng vào ô Slot 1, 2, 3
        // ---------------------------------------------------------------------
        const targetSlotIndex = this.findHoveredSlotIndex(cardCtrl.node);
        if (targetSlotIndex !== -1) {
            // Trường hợp 1A: Kéo từ Slot thả lại đúng Slot đó (hủy di chuyển)
            if (fromSlotIndex === targetSlotIndex) {
                cardManager.playCardToSlot(cardCtrl, targetSlotIndex);
                return;
            }

            // Trường hợp 1B: Kéo từ TAY vào Slot
            if (fromSlotIndex === -1) {
                const oldCard = cardManager.slotCards[targetSlotIndex];
                const oldCardCost = oldCard ? oldCard.manaCost : 0;
                const effectiveMana = (playerMana ? playerMana.currentMana : 0) + oldCardCost;

                // Kiểm tra đủ Mana
                if (effectiveMana < cardCost) {
                    console.warn(`[CardInteractionManager] Không đủ Mana (${effectiveMana}/${cardCost}) để đánh "${cardCtrl.config.name}"!`);
                    playerMana?.flashNotEnoughMana();
                    cardManager.returnCardToHand(cardCtrl, originalHandIndex);
                    return;
                }

                // Đủ Mana -> Hoàn Mana lá cũ (nếu có) và trừ Mana lá mới
                if (oldCard && playerMana) {
                    playerMana.gainMana(oldCardCost);
                }
                if (playerMana) {
                    playerMana.spendMana(cardCost);
                }

                console.log(`[CardInteractionManager] Đánh vào Slot ${targetSlotIndex + 1}: ${cardCtrl.config.name} (Tốn ${cardCost} Mana)`);
                cardManager.playCardToSlot(cardCtrl, targetSlotIndex);
                return;
            }

            // Trường hợp 1C: Kéo từ Slot này sang Slot khác (đã trả Mana ở Slot trước)
            if (fromSlotIndex !== -1 && fromSlotIndex !== targetSlotIndex) {
                const oldCard = cardManager.slotCards[targetSlotIndex];
                if (oldCard && playerMana) {
                    playerMana.gainMana(oldCard.manaCost);
                }
                cardManager.playCardToSlot(cardCtrl, targetSlotIndex);
                return;
            }
        }

        // ---------------------------------------------------------------------
        // 2. Thả vào vùng PlayZone (chưa trúng ô cụ thể) -> Tự động tìm Slot trống
        // ---------------------------------------------------------------------
        if (this.isDropInsideZone(cardCtrl.node, this.playZoneNode)) {
            const availableSlotIndex = cardManager.findAvailableSlotIndex();
            if (availableSlotIndex !== -1) {
                if (fromSlotIndex === -1) {
                    if (playerMana && !playerMana.hasEnoughMana(cardCost)) {
                        console.warn(`[CardInteractionManager] Không đủ Mana để vào PlayZone!`);
                        playerMana.flashNotEnoughMana();
                        cardManager.returnCardToHand(cardCtrl, originalHandIndex);
                        return;
                    }

                    playerMana?.spendMana(cardCost);
                    console.log(`[CardInteractionManager] Thả PlayZone -> Slot ${availableSlotIndex + 1}: ${cardCtrl.config.name}`);
                    cardManager.playCardToSlot(cardCtrl, availableSlotIndex);
                    return;
                } else {
                    // Kéo từ Slot khác sang Slot trống
                    cardManager.playCardToSlot(cardCtrl, availableSlotIndex);
                    return;
                }
            }
        }

        // ---------------------------------------------------------------------
        // 3. Thả vào DiscardZone -> Kích hoạt hiệu ứng Discard và CỘNG MANA
        // ---------------------------------------------------------------------
        if (this.isDropInsideZone(cardCtrl.node, this.discardNode)) {
            console.log(`[CardInteractionManager] Thả vào DiscardZone: ${cardCtrl.config.name} -> Nhận ${cardCost} Mana!`);
            cardManager.discardCardWithAnimation(cardCtrl, true);
            return;
        }

        // ---------------------------------------------------------------------
        // 4. Kéo ra ngoài Slot (kéo về phía tay, hoặc thả vào bất cứ đâu khác) -> Hoàn bài về tay!
        // ---------------------------------------------------------------------
        if (fromSlotIndex !== -1) {
            // Lá bài vừa được gắp từ Slot trả về tay -> Hoàn lại số Mana đã bỏ ra!
            console.log(`[CardInteractionManager] Kéo từ Slot về tay: Hoàn lại ${cardCost} Mana cho người chơi!`);
            playerMana?.gainMana(cardCost);
        } else {
            console.log(`[CardInteractionManager] Hoàn lá "${cardCtrl.config.name}" về lại tay`);
        }

        cardManager.returnCardToHand(cardCtrl, originalHandIndex);
    }

    // =========================================================================
    // 5. CÁC HÀM XÁC THỰC TOẠ ĐỘ VÙNG RƠI (HIT-TESTING)
    // =========================================================================

    /**
     * Tìm xem lá bài đang hover trên ô Slot nào
     */
    public findHoveredSlotIndex(cardNode: Node): number {
        const cardWorldPos = cardNode.worldPosition;
        const cardPt = new Vec2(cardWorldPos.x, cardWorldPos.y);

        for (let i = 0; i < this.slotNodes.length; i++) {
            const slotNode = this.slotNodes[i];
            if (!slotNode || !slotNode.activeInHierarchy) continue;

            const slotTrans = slotNode.getComponent(UITransform);
            if (!slotTrans) continue;

            if (slotTrans.getBoundingBoxToWorld().contains(cardPt)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Kiểm tra xem tâm lá bài có nằm trọn trong vùng của một Node không (PlayZone, DiscardZone,...)
     */
    public isDropInsideZone(cardNode: Node, zoneNode: Node | null): boolean {
        if (!zoneNode || !zoneNode.activeInHierarchy) return false;
        const zoneTrans = zoneNode.getComponent(UITransform);
        if (!zoneTrans) return false;

        const zoneBox = zoneTrans.getBoundingBoxToWorld();
        const cardWorldPos = cardNode.worldPosition;
        return zoneBox.contains(new Vec2(cardWorldPos.x, cardWorldPos.y));
    }
}
