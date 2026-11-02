import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

export enum CardType {
    ATK = 'ATK',
    DRAW = 'DRAW',
    HEAL = 'HEAL',
}


export enum CardTargetType {
    SINGLE_ENEMY = 'SINGLE_ENEMY',
    RANDOM_ENEMY = 'RANDOM_ENEMY',
    ALL_ENEMIES = 'ALL_ENEMIES',
    SELF = 'SELF',
    NONE = 'NONE'
}

export interface ICardConfig {
    id: string;
    name: string;
    type: CardType;
    targetType: CardTargetType; // Phạm vi tác động
    targetCount?: number;       // Số mục tiêu nếu là RANDOM_ENEMY
    manaCost: number;
    value: number;              // Lượng dame / Lượng máu hồi / Số lá rút
    customDesc?: string;
}