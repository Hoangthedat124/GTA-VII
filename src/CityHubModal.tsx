import React from 'react';
import {Activity, Home, Settings, Trophy, Zap} from 'lucide-react';
import type {SceneCommandApi} from '../Game';
import {HubTab, HudTelemetry, WeaponId} from '../types';
import {gameAudio} from '../utils';
import {MenuOverlay} from '../utils/helper';
import {
  HOUSES,
  MISSIONS,
  PAINT_OPTIONS,
  SIDE_MISSIONS,
  VEHICLE_SHOP_CATALOG,
  WEAPONS,
  WEAPON_ORDER,
} from './worldData';

interface CityHubModalProps {
  hud: HudTelemetry;
  activeTab: HubTab;
  onChangeTab: (tab: HubTab) => void;
  onClose: () => void;
  api: SceneCommandApi | null;
}

const TABS: Array<{id: HubTab; label: string}> = [
  {id: 'missions', label: 'Nhiệm Vụ'},
  {id: 'shop', label: 'Cửa Hàng'},
  {id: 'bank', label: 'Ngân Hàng'},
  {id: 'garage', label: 'Xe & Gara'},
  {id: 'houses', label: 'Nhà Ở'},
];

export function CityHubModal({
  hud,
  activeTab,
  onChangeTab,
  onClose,
  api,
}: CityHubModalProps): React.ReactElement {
  return (
    <MenuOverlay tone="neutral" zIndex={52}>
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-cyan-500/45 rounded-2xl p-4 md:p-5 m-2 shadow-2xl flex flex-col gap-3 max-h-[88vh]">
        {/* Header + Currency Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-amber-400 tracking-wide">
              TRUNG TÂM PORT AURELIA
            </h2>
            <div className="text-[11px] text-slate-400">
              Tiền mặt:{' '}
              <span className="text-emerald-400 font-bold">
                ${hud.money.toLocaleString('en-US')}
              </span>{' '}
              · Ngân hàng:{' '}
              <span className="text-cyan-300 font-bold">
                ${hud.bankBalance.toLocaleString('en-US')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              onClose();
            }}
            className="min-h-[40px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs">
            Đóng [B]
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-5 gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                onChangeTab(t.id);
              }}
              className={`min-h-[42px] rounded-xl text-[11px] md:text-xs font-extrabold border transition-colors px-1 ${
                activeTab === t.id
                  ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable Tab Content */}
        <div className="overflow-y-auto pr-1 space-y-3 max-h-[58vh]">
          {activeTab === 'missions' && (
            <div className="space-y-3">
              {/* Port Aurelia GP Racetrack Event Card */}
              <div className="bg-gradient-to-r from-orange-950/80 to-slate-950 border border-orange-500/60 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <div className="font-black text-orange-300 flex items-center gap-1.5">
                    <Zap size={14} className="text-orange-400" />
                    GIẢI ĐUA Ô TÔ PORT AURELIA GP (3 VÒNG · 5 ĐỐI THỦ AI)
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Thi đấu trực tiếp tại Trường Đua Đông Tân Đô cùng 5 tay đua AI! Hạng 1: +$4,500 · Hạng 2: +$2,500 · Hạng 3: +$1,400.
                  </div>
                </div>
                {hud.raceActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      api?.cancelRace();
                      onClose();
                    }}
                    className="min-h-[38px] px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold shrink-0">
                    Rời đua
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      api?.startRace();
                      onClose();
                    }}
                    className="min-h-[38px] px-3 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-extrabold shrink-0">
                    Đua Ngay!
                  </button>
                )}
              </div>

              {(hud.activeMissionId !== null ||
                hud.activeSideMissionId !== null) && (
                <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <div className="font-bold text-amber-300">
                      Đang thực hiện: {hud.activeMissionTitle}
                    </div>
                    <div className="text-slate-300">
                      {hud.activeMissionObjective}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => api?.cancelActiveMission()}
                    className="min-h-[38px] px-3 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold">
                    Hủy
                  </button>
                </div>
              )}

              <div>
                <div className="text-xs font-bold text-cyan-300 mb-1.5 flex items-center gap-1.5">
                  <Trophy size={14} />
                  NHIỆM VỤ CHÍNH ({hud.completedMissions.length}/
                  {MISSIONS.length})
                </div>
                <div className="space-y-1.5">
                  {MISSIONS.map((m) => {
                    const done = hud.completedMissions.includes(m.id);
                    const running = hud.activeMissionId === m.id;
                    return (
                      <div
                        key={m.id}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <div className="text-xs">
                          <div className="font-bold text-slate-100">
                            {m.id}. {m.title}{' '}
                            {done && (
                              <span className="text-emerald-400">
                                (Đã xong)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {m.description}
                          </div>
                          <div className="text-[11px] text-amber-300 font-semibold mt-0.5">
                            Thưởng: +${m.rewardMoney.toLocaleString('en-US')} · +
                            {m.rewardScore} điểm
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={running}
                          onClick={() => {
                            api?.startMission(m.id);
                            onClose();
                          }}
                          className={`min-h-[38px] px-3 rounded-lg text-xs font-bold shrink-0 ${
                            running
                              ? 'bg-amber-600 text-slate-950'
                              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                          }`}>
                          {running ? 'Đang chạy' : done ? 'Chơi lại' : 'Nhận'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-purple-300 mb-1.5 flex items-center gap-1.5">
                  <Activity size={14} />
                  NHIỆM VỤ PHỤ (Lặp lại để kiếm thêm tiền)
                </div>
                <div className="space-y-1.5">
                  {SIDE_MISSIONS.map((sm) => {
                    const done = hud.completedSideMissions.includes(sm.id);
                    const running = hud.activeSideMissionId === sm.id;
                    return (
                      <div
                        key={sm.id}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <div className="text-xs">
                          <div className="font-bold text-purple-200">
                            {sm.title}{' '}
                            {done && (
                              <span className="text-emerald-400 text-[10px]">
                                (Đã hoàn thành)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {sm.description}
                          </div>
                          <div className="text-[11px] text-emerald-300 font-semibold mt-0.5">
                            Thưởng: +${sm.rewardMoney.toLocaleString('en-US')} ·
                            Giới hạn {sm.timeLimitSec}s
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={running}
                          onClick={() => {
                            api?.startSideMission(sm.id);
                            onClose();
                          }}
                          className={`min-h-[38px] px-3 rounded-lg text-xs font-bold shrink-0 ${
                            running
                              ? 'bg-amber-600 text-slate-950'
                              : 'bg-purple-500 hover:bg-purple-400 text-white'
                          }`}>
                          {running ? 'Đang chạy' : 'Nhận'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => api?.buySupply('medkit')}
                  className="bg-slate-950 hover:bg-slate-800 border border-emerald-500/45 rounded-xl p-3 text-left">
                  <div className="text-xs font-bold text-emerald-300">
                    Túi Y Tế (Hồi đầy Máu)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Hiện tại: {hud.health}/{hud.maxHealth}
                  </div>
                  <div className="text-xs font-extrabold text-amber-300 mt-1">
                    Giá: $180
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => api?.buySupply('armor')}
                  className="bg-slate-950 hover:bg-slate-800 border border-sky-500/45 rounded-xl p-3 text-left">
                  <div className="text-xs font-bold text-sky-300">
                    Áo Giáp Chống Đạn
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Hiện tại: {hud.armor}/{hud.maxArmor}
                  </div>
                  <div className="text-xs font-extrabold text-amber-300 mt-1">
                    Giá: $250
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => api?.buySupply('ammo')}
                  className="bg-slate-950 hover:bg-slate-800 border border-amber-500/45 rounded-xl p-3 text-left">
                  <div className="text-xs font-bold text-amber-300">
                    Thùng Đạn Tiếp Tế
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Đầy đạn cho tất cả súng
                  </div>
                  <div className="text-xs font-extrabold text-amber-300 mt-1">
                    Giá: $120
                  </div>
                </button>
              </div>

              <div>
                <div className="text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                  <Zap size={14} />
                  NÂNG CẤP VŨ KHÍ (+25% sát thương mỗi cấp)
                </div>
                <div className="space-y-1.5">
                  {WEAPON_ORDER.map((wId: WeaponId) => {
                    const spec = WEAPONS[wId];
                    const lvl = hud.weaponUpgrades[wId] ?? 0;
                    const cost = 450 + lvl * 350;
                    const effectiveDmg = Math.round(
                      spec.damage * (1 + lvl * 0.25),
                    );
                    return (
                      <div
                        key={wId}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <div className="text-xs">
                          <div className="font-bold text-slate-100">
                            {spec.name}{' '}
                            <span className="text-cyan-400">Lv.{lvl}/3</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Sát thương hiện tại: {effectiveDmg}{' '}
                            {spec.pellets > 1 ? `x${spec.pellets} viên` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={lvl >= 3}
                          onClick={() => api?.upgradeWeapon(wId)}
                          className={`min-h-[38px] px-3 rounded-lg text-xs font-bold ${
                            lvl >= 3
                              ? 'bg-slate-800 text-slate-500'
                              : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                          }`}>
                          {lvl >= 3 ? 'Tối đa' : `Nâng ($${cost})`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="space-y-3">
              <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-3.5 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-slate-400">
                    Tiền mặt mang theo
                  </div>
                  <div className="text-xl font-black text-emerald-400">
                    ${hud.money.toLocaleString('en-US')}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">
                    Số dư Ngân Hàng (Lãi +5%/nhiệm vụ)
                  </div>
                  <div className="text-xl font-black text-cyan-300">
                    ${hud.bankBalance.toLocaleString('en-US')}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="text-xs font-bold text-slate-200">
                  Gửi Tiền Mặt vào Ngân Hàng
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[500, 2000, hud.money].map((amt, i) => (
                    <button
                      key={`dep-${i}`}
                      type="button"
                      onClick={() => api?.bankDeposit(amt)}
                      className="min-h-[40px] rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold">
                      {i === 2 ? 'Gửi hết' : `+$${amt.toLocaleString('en-US')}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="text-xs font-bold text-slate-200">
                  Rút Tiền từ Ngân Hàng
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[500, 2000, hud.bankBalance].map((amt, i) => (
                    <button
                      key={`wit-${i}`}
                      type="button"
                      onClick={() => api?.bankWithdraw(amt)}
                      className="min-h-[40px] rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold">
                      {i === 2 ? 'Rút hết' : `-$${amt.toLocaleString('en-US')}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 border border-red-500/40 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <div className="font-bold text-red-300">
                    Nộp Phí Bảo Lãnh Xóa Truy Nã
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Hiện tại: {hud.wantedLevel}★ (Phí $300 / sao)
                  </div>
                </div>
                <button
                  type="button"
                  disabled={hud.wantedLevel === 0}
                  onClick={() => api?.payBail()}
                  className={`min-h-[40px] px-3 rounded-lg text-xs font-bold ${
                    hud.wantedLevel === 0
                      ? 'bg-slate-800 text-slate-500'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}>
                  {hud.wantedLevel === 0
                    ? 'Đang an toàn'
                    : `Xóa ($${hud.wantedLevel * 300})`}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'garage' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                <div className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Settings size={14} className="text-amber-400" />
                  <span>
                    Đã sở hữu {hud.ownedVehicles.length}/
                    {VEHICLE_SHOP_CATALOG.length} phương tiện
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => api?.repairAllVehicles()}
                  className="min-h-[36px] px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs">
                  Bảo dưỡng toàn bộ ($200)
                </button>
              </div>

              <div className="space-y-2">
                {VEHICLE_SHOP_CATALOG.map((item) => {
                  const owned = hud.ownedVehicles.includes(item.kind);
                  return (
                    <div
                      key={item.kind}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs">
                          <div className="font-bold text-slate-100">
                            {item.name}{' '}
                            {owned && (
                              <span className="text-emerald-400">
                                (Trong Gara)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.description}
                          </div>
                          <div className="text-[10px] text-cyan-300 mt-0.5">
                            Tốc độ tối đa: {item.topSpeedKmh} km/h · Giáp:{' '}
                            {item.armorLabel}
                          </div>
                        </div>
                        {owned ? (
                          <button
                            type="button"
                            onClick={() => {
                              api?.spawnOwnedVehicle(item.kind);
                              onClose();
                            }}
                            className="min-h-[40px] px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shrink-0">
                            Triệu hồi xe
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => api?.buyVehicle(item.kind)}
                            className="min-h-[40px] px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shrink-0">
                            Mua (${item.price.toLocaleString('en-US')})
                          </button>
                        )}
                      </div>

                      {owned && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
                          <span className="text-[10px] text-slate-400 mr-1">
                            Sơn xe ($150):
                          </span>
                          {PAINT_OPTIONS.map((p) => (
                            <button
                              key={p.hex}
                              type="button"
                              title={p.label}
                              onClick={() =>
                                api?.paintVehicle(item.kind, p.hex)
                              }
                              style={{backgroundColor: p.hex}}
                              className={`w-6 h-6 rounded-full border-2 ${
                                hud.vehicleColors[item.kind] === p.hex
                                  ? 'border-white scale-110'
                                  : 'border-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'houses' && (
            <div className="space-y-2.5">
              <div className="text-xs text-slate-300 flex items-center gap-1.5">
                <Home size={14} className="text-amber-400" />
                <span>
                  Mua nhà để hồi đầy máu, qua ngày nhận thời tiết mới, xóa truy
                  nã và dịch chuyển nhanh!
                </span>
              </div>
              {HOUSES.map((h) => {
                const owned = hud.ownedHouses.includes(h.id);
                return (
                  <div
                    key={h.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs max-w-md">
                      <div className="font-bold text-amber-300">
                        {h.name}{' '}
                        {owned && (
                          <span className="text-emerald-400">(Đã sở hữu)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-cyan-300">
                        {h.district}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {h.description}
                      </div>
                    </div>
                    {owned ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => api?.restAtHouse(h.id)}
                          className="min-h-[38px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                          Nghỉ ngơi (Đầy máu + Xóa sao)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            api?.teleportToHouse(h.id);
                            onClose();
                          }}
                          className="min-h-[38px] px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs">
                          {h.isHighRise ? 'Lên Căn Hộ Trên Cao' : 'Về nhà'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => api?.buyHouse(h.id)}
                        className="min-h-[40px] px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs">
                        Mua (${h.price.toLocaleString('en-US')})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MenuOverlay>
  );
}
