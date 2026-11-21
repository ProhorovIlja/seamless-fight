// All UI copy is deliberately original. Mechanics keep the Hunt v3 rules.
// Production title is a WORKING TITLE until legal/storefront clearance.
import {HUNT_ACTIONS,HUNT_RULESET,HUNT_WEAPONS} from './side-hunt-lab.mjs';
export const HUNT_IDENTITY_SCHEMA='sf-hunt-identity/1';
export const HUNT_WORKING_TITLE='Seamless Fight';
export const HUNT_PUBLIC_LOCALES=Object.freeze(['en','ru']);
const copy={
 en:{
  title:'Seamless Fight',tagline:'The night remembers every duel.',
  modeDuel:'Duel',modeTraining:'Practice',modeSpectate:'Witness',
  ready:'The Court Awaits',round:'Round',victory:'Duel Concluded',
  playerOne:'First Hunter',playerTwo:'Second Hunter',
  life:'Vitality',stamina:'Endurance',ammo:'Silver Rounds',
  bloodAmmo:'Crimson Rounds',vials:'Restorative Vials',
  rally:'Reclaim',focus:'Pursuit',visceral:'Rending Strike',
  parry:'Firearm Counter',rearStagger:'Rear Stagger',hitstun:'Hitstun',
  stagger:'Exposed',whiff:'Missed Strike',
  intro:'Entrance',outro:'Departure',taunts:'Gestures',
  weaponMournweave:'Mournweave',weaponThornwake:'Thornwake',
  formFolded:'Sealed',formUnfurled:'Unbound',
  practiceRecord:'Record Dummy',practiceReplay:'Play Recording',
  practiceReversal:'Reversal',practiceStep:'Advance One Frame',
  practiceRewind:'Rewind',practiceFrameData:'Frame Data',
  practiceInputHistory:'Input History',practiceReset:'Restart',
  practiceFrameStartup:'Startup',practiceFrameActive:'Active',
  practiceFrameRecovery:'Recovery',practiceTick:'Simulation Frame',
  practiceCounterWindow:'Counter Window',practiceDodgeEscape:'Dodge Recovery',
  audioMaster:'Master Volume',audioEffects:'Effects',audioMusic:'Music',
  audioVoices:'Voices',audioDynamicRange:'Dynamic Range',
  videoFramerate:'Display FPS',videoVsync:'Vertical Synchronization',
  videoMotion:'Reduce Camera Motion',videoFrameGraph:'Frame-time Graph',
  inputKeyboard:'Keyboard & Mouse',inputController:'Controller',
  inputFightstick:'Arcade Stick',inputLeverless:'Leverless',
  inputFightpad:'Fightpad',inputAccessible:'Adaptive Inputs',
  inputRebind:'Rebind Controls',inputSocd:'Opposite Directions: Neutral',
  onlinePrivate:'Private Duel',onlineUnrated:'Unrated',
  onlineRanked:'Ranked (Unavailable)',
  noticeNotNative:'Hunt research mode; native Windows integration pending.',
  noticeUnavailable:'This feature is not available in the current build.',
  noticeNoRig:'The original hunter rig has not passed asset review.',
  noticeAssetReview:'Original or properly licensed assets only.',
  noticeRollback:'Rollback verification is required for competitive play.',
  noticeTesting:'Controller compatibility requires actual hardware testing.',
  noticeLoading:'Preparing the court'
 },
 ru:{
  title:'Seamless Fight',tagline:'Ночь помнит каждую дуэль.',
  modeDuel:'Дуэль',modeTraining:'Тренировка',modeSpectate:'Наблюдение',
  ready:'Суд ожидает',round:'Раунд',victory:'Дуэль завершена',
  playerOne:'Первый охотник',playerTwo:'Второй охотник',
  life:'Здоровье',stamina:'Выносливость',ammo:'Серебряные патроны',
  bloodAmmo:'Багряные патроны',vials:'Лечебные флаконы',
  rally:'Возврат здоровья',focus:'Преследование',visceral:'Разрывающий удар',
  parry:'Контрудар выстрелом',rearStagger:'Оглушение со спины',
  hitstun:'Оглушение',stagger:'Открыт для удара',whiff:'Промах',
  intro:'Выход на арену',outro:'Уход с арены',taunts:'Жесты',
  weaponMournweave:'Морнвейв',weaponThornwake:'Торнвейк',
  formFolded:'Сложенное',formUnfurled:'Развёрнутое',
  practiceRecord:'Запись манекена',practiceReplay:'Повтор записи',
  practiceReversal:'Ответное действие',practiceStep:'Следующий кадр',
  practiceRewind:'Перемотка',practiceFrameData:'Фреймдата',
  practiceInputHistory:'История ввода',practiceReset:'Перезапуск',
  practiceFrameStartup:'Подготовка',practiceFrameActive:'Активные кадры',
  practiceFrameRecovery:'Восстановление',practiceTick:'Кадр симуляции',
  practiceCounterWindow:'Окно парирования',practiceDodgeEscape:'Выход уклонением',
  audioMaster:'Общая громкость',audioEffects:'Эффекты',audioMusic:'Музыка',
  audioVoices:'Голоса',audioDynamicRange:'Динамический диапазон',
  videoFramerate:'Частота отображения',videoVsync:'Вертикальная синхронизация',
  videoMotion:'Уменьшение движения камеры',videoFrameGraph:'График времени кадра',
  inputKeyboard:'Клавиатура и мышь',inputController:'Геймпад',
  inputFightstick:'Аркадный стик',inputLeverless:'Безрычажный контроллер',
  inputFightpad:'Файтпад',inputAccessible:'Адаптивный ввод',
  inputRebind:'Переназначение управления',inputSocd:'Противоположные направления: нейтраль',
  onlinePrivate:'Закрытая дуэль',onlineUnrated:'Без рейтинга',
  onlineRanked:'Рейтинговый режим (недоступен)',
  noticeNotNative:'Эксперимент Hunt; интеграция с Windows ещё не готова.',
  noticeUnavailable:'Эта функция пока недоступна.',
  noticeNoRig:'Оригинальная модель охотника не прошла проверку.',
  noticeAssetReview:'Только оригинальные или лицензированные материалы.',
  noticeRollback:'Для рейтинговых боёв требуется проверка rollback.',
  noticeTesting:'Совместимость контроллера требует проверки на устройстве.',
  noticeLoading:'Подготовка арены'
 }
};
const ACTION_NAMES={
 light:'Light Strike',heavy:'Heavy Strike',charge:'Charged Strike',
 trick:'Transform Arm',shot:'Fire',step:'Quickstep',
 feint:'Feint',sync:'Follow-up',visceral:'Rending Strike',
 heal:'Use Vial',blood:'Create Crimson Rounds'
};
const ACTION_NAMES_RU={
 light:'Лёгкий удар',heavy:'Тяжёлый удар',charge:'Заряженный удар',
 trick:'Трансформация оружия',shot:'Выстрел',step:'Уклонение',
 feint:'Обманное движение',sync:'Продолжение комбо',visceral:'Разрывающий удар',
 heal:'Использовать флакон',blood:'Создать багряные патроны'
};
export const HUNT_COPY=Object.freeze(Object.fromEntries(
 Object.entries(copy).map(([locale,strings])=>[locale,Object.freeze({...strings})])));
export function huntText(key,locale='en'){
 if(!HUNT_PUBLIC_LOCALES.includes(locale))throw TypeError('Unsupported locale');
 if(!Object.hasOwn(HUNT_COPY[locale],key))throw RangeError('Unknown public UI string');
 return HUNT_COPY[locale][key];
}
export function huntActionName(action,locale='en'){
 if(!HUNT_PUBLIC_LOCALES.includes(locale))throw TypeError('Unsupported locale');
 if(!HUNT_ACTIONS.includes(action))throw RangeError('Unknown combat action');
 if(!action)return locale==='ru'?'Нет действия':'Neutral';
 return (locale==='ru'?ACTION_NAMES_RU:ACTION_NAMES)[action];
}
export function huntPublicHud(state,slot=0,locale='en'){
 if(state?.rules!==HUNT_RULESET||!Array.isArray(state.p)||![0,1].includes(slot))
  throw TypeError('Incompatible source fight');
 if(!HUNT_PUBLIC_LOCALES.includes(locale))throw TypeError('Unsupported locale');
 const p=state.p[slot];
 if(!HUNT_WEAPONS.includes(p.weapon))throw TypeError('Unknown arsenal');
 const fmt={
  name:huntText(slot===0?'playerOne':'playerTwo',locale),
  weapon:huntText(p.weapon==='mournweave'?'weaponMournweave':'weaponThornwake',locale),
  form:huntText(p.form==='folded'?'formFolded':'formUnfurled',locale),
  health:p.hp,stamina:p.st,ammo:p.ammo,bloodAmmo:p.bloodAmmo,
  vials:p.vials,focus:p.focus,
  labels:Object.freeze({
   health:huntText('life',locale),stamina:huntText('stamina',locale),
   ammo:huntText('ammo',locale),bloodAmmo:huntText('bloodAmmo',locale),
   vials:huntText('vials',locale),focus:huntText('focus',locale)
  })
 };
 return Object.freeze(fmt);
}
