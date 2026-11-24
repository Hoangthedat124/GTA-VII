import React, {useState} from 'react';
import {Activity, Home, Settings, Trophy, Zap} from 'lucide-react';
import type {SceneCommandApi} from '../Game';
import {HubTab, HudTelemetry, WeaponId} from '../types';
import {gameAudio} from '../utils';
import {
  HOUSES,
  VEHICLE_SHOP_CATALOG,
  WEAPONS,
  WEAPON_ORDER,
} from './worldData';

interface PhoneAppPanelProps {
  hud: HudTelemetry;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenHub: (tab: HubTab) => void;
  api: SceneCommandApi | null;
  isMobile: boolean;
}

type PhoneTab = 'home' | 'assets' | 'apps';

export const PhoneAppPanel = React.memo(function PhoneAppPanel({
  hud,
  isOpen,
  onToggleOpen,
  onOpenHub,
  api,
  isMobile,
}: PhoneAppPanelProps): React.ReactElement {
  const [phoneTab, setPhoneTab] = useState<PhoneTab>('home');

  const ownedHouseDefs = HOUSES.filter((h) => hud.ownedHouses.includes(h.id));
  const ownedVehicleDefs = VEHICLE_SHOP_CATALOG.filter((v) =>
    hud.ownedVehicles.includes(v.kind),
  );

  const realEstateValue = ownedHouseDefs.reduce((sum, h) => sum + h.price, 0);
  const fleetValue = ownedVehicleDefs.reduce((sum, v) => sum + v.price, 0);
  const totalNetWorth = hud.money + hud.bankBalance + realEstateValue + fleetValue;
  const isWanted = hud.wantedLevel > 0;

  // Minimized Smartphone Launcher Pill docked on the right edge (just below MENU button)
  if (!isOpen) {
    return (
      <div
        className={`absolute top-16 ${isMobile ? 'right-8' : 'right-4'} z-30 pointer-events-none`}>
        <button
          type="button"
          onClick={() => {
            gameAudio.playCrispClick();
            onToggleOpen();
          }}
          className="pointer-events-auto min-h-[44px] px-3 py-2 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border-2 border-cyan-400/60 text-white shadow-xl backdrop-blur-md flex items-center gap-2 transition-transform active:scale-95">
          <span className="text-base leading-none">📱</span>
          <div className="text-left leading-tight">
            <div className="text-[11px] font-extrabold text-cyan-300 tracking-wide">
              Kho Ứng Dụng
            </div>
            <div className="text-[9px] text-slate-300">
              {isWanted
                ? `🔒 Truy nã ${hud.wantedLevel}★`
                : `🏠 Về nhà · ${ownedHouseDefs.length} nhà`}
            </div>
          </div>
        </button>
      </div>
    );
  }

  // Expanded Right-Side Smartphone Chassis ("Kho Ứng Dụng")
  return (
    <div
      className={`absolute top-16 ${isMobile ? 'right-4' : 'right-4'} z-30 pointer-events-none`}>
      <div className="pointer-events-auto w-[272px] sm:w-[292px] max-h-[68vh] bg-slate-950/95 border-[3px] border-slate-600 rounded-[26px] shadow-2xl overflow-hidden flex flex-col backdrop-blur-md">
        {/* Smartphone Dynamic Island & Status Bar */}
        <div className="bg-slate-900 px-3.5 pt-2 pb-1.5 border-b border-slate-800">
          <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold mb-1">
            <span>{hud.timeOfDayLabel.split(' · ')[0]}</span>
            <div className="w-16 h-2.5 bg-black rounded-full border border-slate-700" />
            <span className="text-emerald-400">5G · 98%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">📱</span>
              <span className="text-xs font-black tracking-wide text-cyan-300">
                KHO ỨNG DỤNG
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                onToggleOpen();
              }}
              className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700">
              Thu gọn ✕
            </button>
          </div>
        </div>

        {/* App Selector Navigation Bar */}
        <div className="grid grid-cols-3 gap-1 p-1.5 bg-slate-900/70 border-b border-slate-800">
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              setPhoneTab('home');
            }}
            className={`py-1.5 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 transition-colors ${
              phoneTab === 'home'
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}>
            <Home size={12} />
            Về Nhà
          </button>
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              setPhoneTab('assets');
            }}
            className={`py-1.5 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 transition-colors ${
              phoneTab === 'assets'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}>
            <Trophy size={12} />
            Tài Sản
          </button>
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              setPhoneTab('apps');
            }}
            className={`py-1.5 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 transition-colors ${
              phoneTab === 'apps'
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}>
            <Zap size={12} />
            Tiện Ích
          </button>
        </div>

        {/* Scrollable Phone Screen Body */}
        <div className="p-2.5 overflow-y-auto space-y-2.5 text-xs max-h-[48vh]">
          {/* TAB 1: BIẾN VỀ NHÀ */}
          {phoneTab === 'home' && (
            <div className="space-y-2.5">
              {/* Wanted-Level Gate Banner */}
              <div
                className={`rounded-xl p-2.5 border text-[11px] leading-snug ${
                  isWanted
                    ? 'bg-red-950/80 border-red-500/75 text-red-200'
                    : 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                }`}>
                {isWanted ? (
                  <div>
                    <div className="font-extrabold text-red-300">
                      🔒 ĐANG BỊ TRUY NÃ ({hud.wantedLevel}★)
                    </div>
                    <div className="text-[10px] mt-0.5 text-red-200/90">
                      Phải hết truy nã mới biến về nhà được! Hãy cắt đuôi cảnh sát hoặc nộp phạt bảo lãnh.
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-extrabold text-emerald-300">
                      ✅ Trạng thái an toàn (0★)
                    </div>
                    <div className="text-[10px] mt-0.5 text-emerald-200/90">
                      Bạn có thể dịch chuyển tức thì về bất kỳ căn nhà nào đang sở hữu.
                    </div>
                  </div>
                )}
              </div>

              {/* Primary Teleport Home Button */}
              <button
                type="button"
                onClick={() => api?.teleportHome()}
                className={`w-full min-h-[42px] rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-colors ${
                  isWanted
                    ? 'bg-red-900/60 hover:bg-red-900/80 border border-red-500/60 text-red-200'
                    : 'bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950'
                }`}>
                <Home size={14} />
                {isWanted
                  ? 'KHÔNG THỂ VỀ NHÀ (ĐANG TRUY NÃ)'
                  : 'BIẾN VỀ NHÀ NGAY'}
              </button>

              {isWanted && (
                <button
                  type="button"
                  onClick={() => api?.payBail()}
                  className="w-full py-2 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px]">
                  Nộp tiền bảo lãnh (${hud.wantedLevel * 300}) để hết truy nã
                </button>
              )}

              {/* Owned Houses Quick Teleport List */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Nhà đang sở hữu ({ownedHouseDefs.length})
                </div>
                {ownedHouseDefs.map((h) => (
                  <div
                    key={h.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-amber-300 text-[11px] truncate">
                        {h.name}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {h.district}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => api?.teleportHome(h.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold shrink-0 ${
                        isWanted
                          ? 'bg-slate-800 text-red-300 border border-red-500/40'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                      }`}>
                      Biến về
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: QUẢN LÝ TÀI SẢN */}
          {phoneTab === 'assets' && (
            <div className="space-y-2.5">
              {/* Total Net Worth Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/40 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold">
                    TỔNG GIÁ TRỊ TÀI SẢN
                  </span>
                  <span className="text-xs font-black text-amber-400">
                    ${totalNetWorth.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="bg-slate-950/80 rounded-lg p-1.5 border border-slate-800">
                    <div className="text-slate-400">Tiền mặt</div>
                    <div className="font-bold text-emerald-400">
                      ${hud.money.toLocaleString('en-US')}
                    </div>
                  </div>
                  <div className="bg-slate-950/80 rounded-lg p-1.5 border border-slate-800">
                    <div className="text-slate-400">Ngân hàng</div>
                    <div className="font-bold text-cyan-300">
                      ${hud.bankBalance.toLocaleString('en-US')}
                    </div>
                  </div>
                </div>
                {hud.money > 0 && (
                  <button
                    type="button"
                    onClick={() => api?.bankDeposit(hud.money)}
                    className="w-full py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px]">
                    Gửi toàn bộ tiền mặt vào Ngân hàng (+5% lãi)
                  </button>
                )}
              </div>

              {/* Owned Real Estate */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Bất động sản ({ownedHouseDefs.length}/{HOUSES.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenHub('houses')}
                    className="text-[10px] font-bold text-cyan-400 hover:underline">
                    + Mua nhà
                  </button>
                </div>
                {ownedHouseDefs.map((h) => (
                  <div
                    key={`ast-h-${h.id}`}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-100 text-[10px] truncate">
                        {h.name}
                      </div>
                      <div className="text-[9px] text-amber-300">
                        {h.price === 0
                          ? 'Miễn phí'
                          : `$${h.price.toLocaleString('en-US')}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => api?.restAtHouse(h.id)}
                        className="px-2 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-[9px] font-bold">
                        Hồi máu
                      </button>
                      <button
                        type="button"
                        onClick={() => api?.teleportHome(h.id)}
                        className="px-2 py-1 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[9px] font-extrabold">
                        Về
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Owned Vehicles */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Phương tiện ({ownedVehicleDefs.length}/
                    {VEHICLE_SHOP_CATALOG.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenHub('garage')}
                    className="text-[10px] font-bold text-amber-400 hover:underline">
                    + Gara [B]
                  </button>
                </div>
                {ownedVehicleDefs.map((v) => (
                  <div
                    key={`ast-v-${v.kind}`}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                        style={{
                          backgroundColor:
                            hud.vehicleColors[v.kind] ?? '#3b82f6',
                        }}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-100 text-[10px] truncate">
                          {v.name}
                        </div>
                        <div className="text-[9px] text-cyan-300">
                          {v.topSpeedKmh} km/h
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => api?.spawnOwnedVehicle(v.kind)}
                      className="px-2 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 text-[9px] font-extrabold shrink-0">
                      Triệu hồi
                    </button>
                  </div>
                ))}
              </div>

              {/* Weapons Upgrade Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Kho Vũ Khí
                </div>
                <div className="flex flex-wrap gap-1">
                  {WEAPON_ORDER.map((wId: WeaponId) => (
                    <span
                      key={`pw-${wId}`}
                      className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-[9px] text-slate-200">
                      {WEAPONS[wId].name.split(' ')[0]} Lv.
                      {hud.weaponUpgrades[wId] ?? 0}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TIỆN ÍCH NHANH */}
          {phoneTab === 'apps' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  api?.startRace();
                  onToggleOpen();
                }}
                className="bg-orange-950/75 hover:bg-orange-900/80 border border-orange-500/60 rounded-xl p-2.5 text-left">
                <Zap size={16} className="text-orange-400 mb-1" />
                <div className="font-extrabold text-orange-200 text-[11px]">
                  Đua Xe GP
                </div>
                <div className="text-[9px] text-slate-300">
                  Vào ngay Trường Đua
                </div>
              </button>
              <button
                type="button"
                onClick={() => onOpenHub('bank')}
                className="bg-emerald-950/75 hover:bg-emerald-900/80 border border-emerald-500/60 rounded-xl p-2.5 text-left">
                <Activity size={16} className="text-emerald-400 mb-1" />
                <div className="font-extrabold text-emerald-200 text-[11px]">
                  Ngân Hàng
                </div>
                <div className="text-[9px] text-slate-300">
                  Gửi / Rút / Bảo lãnh
                </div>
              </button>
              <button
                type="button"
                onClick={() => onOpenHub('garage')}
                className="bg-amber-950/75 hover:bg-amber-900/80 border border-amber-500/60 rounded-xl p-2.5 text-left">
                <Settings size={16} className="text-amber-400 mb-1" />
                <div className="font-extrabold text-amber-200 text-[11px]">
                  Gara &amp; Xe
                </div>
                <div className="text-[9px] text-slate-300">
                  Mua &amp; Sơn màu xe
                </div>
              </button>
              <button
                type="button"
                onClick={() => onOpenHub('shop')}
                className="bg-cyan-950/75 hover:bg-cyan-900/80 border border-cyan-500/60 rounded-xl p-2.5 text-left">
                <Trophy size={16} className="text-cyan-400 mb-1" />
                <div className="font-extrabold text-cyan-200 text-[11px]">
                  Cửa Hàng
                </div>
                <div className="text-[9px] text-slate-300">
                  Đạn, Giáp &amp; Nâng cấp
                </div>
              </button>
              <button
                type="button"
                onClick={() => onOpenHub('houses')}
                className="col-span-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-100 text-[11px]">
                    Sàn Bất Động Sản Port Aurelia
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Mua Chung cư tầng cao &amp; Biệt thự
                  </div>
                </div>
                <Home size={16} className="text-amber-400" />
              </button>
            </div>
          )}
        </div>

        {/* Smartphone Home Bar */}
        <div className="py-1.5 bg-slate-950 flex justify-center border-t border-slate-900">
          <div className="w-20 h-1 rounded-full bg-slate-600" />
        </div>
      </div>
    </div>
  );
});
