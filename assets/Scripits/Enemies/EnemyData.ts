import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

export enum EnemyType {
    SMOL = 'SMOL',
    MID = 'MID',
    BIG = 'BIG',
}

export enum EnemyIntentType {
    ATTACK = 'ATTACK',
    HEAL = 'HEAL',
    BUFF = 'BUFF',
    DODGE = 'DODGE',
}

export interface IEnemyConfig {
    id: string;
    name: string;
    type: EnemyType;
    maxHp: number;
    baseDamage: number;
}

export interface IEnemyAction {
    type: EnemyIntentType;
    value: number;
}