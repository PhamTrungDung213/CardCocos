import { _decorator, Component, Node, EventTouch, Vec2, UITransform } from 'cc';
import { CardCtrl } from './CardCtrl';
import { CardInteractionManager } from './CardInteractionManager';
const { ccclass, property, requireComponent } = _decorator;

@ccclass('CardDragHandler')
@requireComponent(UITransform)
export class CardDragHandler extends Component {
    private _cardCtrl: CardCtrl = null!;
    private _isDragging: boolean = false;
    private _originalIndex: number = -1;
    private _fromSlotIndex: number = -1;

    protected onLoad(): void {
        this._cardCtrl = this.getComponent(CardCtrl)!;

        let trans = this.getComponent(UITransform);
        if (!trans) {
            trans = this.addComponent(UITransform);
            const cardBg = this.node.getChildByName('CardBG');
            const bgTrans = cardBg?.getComponent(UITransform);
            if (bgTrans) {
                trans.setContentSize(bgTrans.contentSize.width, bgTrans.contentSize.height);
                trans.setAnchorPoint(bgTrans.anchorPoint);
            } else {
                trans.setContentSize(393, 478);
            }
        }
    }

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE,  this.onTouchMove,  this);
        this.node.on(Node.EventType.TOUCH_END,   this.onTouchEnd,   this);
        this.node.on(Node.EventType.TOUCH_CANCEL,this.onTouchCancel,this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE,  this.onTouchMove,  this);
        this.node.off(Node.EventType.TOUCH_END,   this.onTouchEnd,   this);
        this.node.off(Node.EventType.TOUCH_CANCEL,this.onTouchCancel,this);
    }

    // ================= XỬ LÝ KÉO THẢ BẰNG TOUCH =================

    private onTouchStart(event: EventTouch): void {
        const interactionMgr = CardInteractionManager.instance;
        if (!interactionMgr) return;

        // 1. Kiểm tra điều kiện kéo thả qua CardInteractionManager
        if (!interactionMgr.canStartDrag(this._cardCtrl)) {
            return;
        }

        if (this._isDragging) return;
        event.propagationStopped = true;

        this._isDragging = true;

        // 2. Kích hoạt bắt đầu kéo trên CardInteractionManager
        const result = interactionMgr.startDrag(this._cardCtrl);
        this._originalIndex = result.inHandIndex;
        this._fromSlotIndex = result.inSlotIndex;
    }

    private onTouchMove(event: EventTouch): void {
        if (!this._isDragging) return;

        const interactionMgr = CardInteractionManager.instance;
        if (!interactionMgr) return;

        interactionMgr.dragMove(this._cardCtrl, event.getUILocation());
    }

    private onTouchEnd(event: EventTouch): void {
        if (!this._isDragging) return;
        this.finishDrag();
    }

    private onTouchCancel(event: EventTouch): void {
        if (!this._isDragging) return;
        this.finishDrag();
    }

    private finishDrag(): void {
        this._isDragging = false;

        const interactionMgr = CardInteractionManager.instance;
        if (interactionMgr) {
            interactionMgr.endDrag(this._cardCtrl, this._originalIndex, this._fromSlotIndex);
        }
    }
}
