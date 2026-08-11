"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Allowance, AttendanceRecord, CorrectionHistory, CorrectionTimeField, Staff } from "@/lib/types";
import { buildMonthlySummary, createEmptyRecord, getBreakIntervalMinutes, getTodayKey, recordsToCsv } from "@/lib/time";
import { isSupabaseConfigured } from "@/lib/supabase";
import { generateSeedData } from "@/lib/seedData";
import { AdminPanel } from "@/components/AdminPanel";
import { AttendanceCard } from "@/components/AttendanceCard";
import { LoginPanel } from "@/components/LoginPanel";
import { loadPersistedData, savePersistedData } from "@/lib/localStorage";
import {
  deleteAllowance as deleteAllowanceCloud,
  deleteAttendanceRecord as deleteAttendanceRecordCloud,
  deleteStaff as deleteStaffCloud,
  fetchAllowances,
  fetchAttendanceRecords,
  fetchAttendanceSnapshot,
  fetchCorrectionHistories,
  fetchStaffList,
  insertAllowance as insertAllowanceCloud,
  insertCorrectionHistories as insertCorrectionHistoriesCloud,
  subscribeToAttendanceData,
  upsertAttendanceRecord,
  upsertStaff,
  updateStaffFields,
} from "@/lib/supabaseData";

const seedData = generateSeedData();
const seedMonths = Array.from(new Set(seedData.records.map((record) => record.workDate.slice(0, 7)))).sort().reverse();

export function AttendanceApp() {
  const cloudEnabled = isSupabaseConfigured;

  console.log("[AttendanceApp] cloudEnabled:", cloudEnabled);

  const persistedData = !cloudEnabled ? loadPersistedData() : null;

  const [pin, setPin] = useState("");
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>(() => {
    if (cloudEnabled) return [];
    if (persistedData?.staff?.length) return persistedData.staff;
    return seedData.staff;
  });
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    if (cloudEnabled) return [];
    if (persistedData?.records?.length) return persistedData.records;
    return seedData.records;
  });
  const [correctionHistories, setCorrectionHistories] = useState<CorrectionHistory[]>(() => {
    if (cloudEnabled) return [];
    if (persistedData?.histories?.length) return persistedData.histories;
    return seedData.histories;
  });
  const [allowances, setAllowances] = useState<Allowance[]>(() => {
    if (cloudEnabled) return [];
    if (persistedData?.allowances?.length) return persistedData.allowances;
    return seedData.allowances ?? [];
  });
  const [message, setMessage] = useState(cloudEnabled ? "クラウドデータを読み込み中..." : "PINを入力してください");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (cloudEnabled) return getTodayKey().slice(0, 7);
    const months = new Set((persistedData?.records ?? seedData.records).map((record) => record.workDate.slice(0, 7)));
    const sorted = Array.from(months).sort().reverse();
    return sorted[0] ?? getTodayKey().slice(0, 7);
  });
  const [isInitialized, setIsInitialized] = useState(!cloudEnabled);
  const [isCloudLoading, setIsCloudLoading] = useState(cloudEnabled);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const recordsRef = useRef(records);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  const availableMonths = useMemo(() => {
    const months = new Set(records.map((record) => record.workDate.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [records]);

  const handleCloudError = useCallback((error: unknown, fallback: string) => {
    console.error(error);
    setCloudError(fallback);
    setMessage(fallback);
  }, []);

  const refreshStaff = useCallback(async () => {
    if (!cloudEnabled) return;
    try {
      const data = await fetchStaffList();
      setStaffList(data);
      setCloudError(null);
    } catch (error) {
      handleCloudError(error, "スタッフ情報の取得に失敗しました");
    }
  }, [cloudEnabled, handleCloudError]);

  const refreshRecords = useCallback(async () => {
    if (!cloudEnabled) return;
    try {
      const data = await fetchAttendanceRecords();
      setRecords(data);
      setCloudError(null);
    } catch (error) {
      handleCloudError(error, "勤務データの取得に失敗しました");
    }
  }, [cloudEnabled, handleCloudError]);

  const refreshAllowances = useCallback(async () => {
    if (!cloudEnabled) return;
    try {
      const data = await fetchAllowances();
      setAllowances(data);
      setCloudError(null);
    } catch (error) {
      handleCloudError(error, "特別手当の取得に失敗しました");
    }
  }, [cloudEnabled, handleCloudError]);

  const refreshCorrections = useCallback(async () => {
    if (!cloudEnabled) return;
    try {
      const data = await fetchCorrectionHistories();
      setCorrectionHistories(data);
      setCloudError(null);
    } catch (error) {
      handleCloudError(error, "修正履歴の取得に失敗しました");
    }
  }, [cloudEnabled, handleCloudError]);

  const initializeFromCloud = useCallback(async () => {
    if (!cloudEnabled) return;
    setIsCloudLoading(true);
    setMessage("クラウドデータを読み込み中...");
    try {
      const snapshot = await fetchAttendanceSnapshot();
      console.log("[Snapshot staff]", snapshot.staff);
      console.log("[Snapshot staff count]", snapshot.staff.length);
      setStaffList(snapshot.staff);
      setRecords(snapshot.records);
      setAllowances(snapshot.allowances);
      setCorrectionHistories(snapshot.histories);
      setCloudError(null);
      setMessage("PINを入力してください");
    } catch (error) {
      handleCloudError(error, "クラウドからデータを取得できませんでした");
    } finally {
      setIsInitialized(true);
      setIsCloudLoading(false);
    }
  }, [cloudEnabled, handleCloudError]);

  useEffect(() => {
    if (cloudEnabled) {
      let cancelled = false;
      let unsubscribe: (() => void) | undefined;

      (async () => {
        await initializeFromCloud();
        if (cancelled) return;
        unsubscribe = subscribeToAttendanceData({
          onStaffChange: refreshStaff,
          onRecordsChange: refreshRecords,
          onAllowancesChange: refreshAllowances,
          onCorrectionsChange: refreshCorrections,
        });
      })();

      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    }

    setIsInitialized(true);
  }, [cloudEnabled, initializeFromCloud, refreshAllowances, refreshCorrections, refreshRecords, refreshStaff]);

  useEffect(() => {
    if (cloudEnabled) return;
    if (!isInitialized) return;
    savePersistedData({
      staff: staffList,
      records,
      allowances,
      histories: correctionHistories,
    });
  }, [cloudEnabled, staffList, records, allowances, correctionHistories, isInitialized]);

  const currentRecord = useMemo(() => {
    if (!currentStaff) return null;
    return records.find((record) => record.staffId === currentStaff.id && record.workDate === getTodayKey()) ?? null;
  }, [currentStaff, records]);

  const displayRecords = useMemo(() => {
    if (!currentStaff) return records;
    if (currentStaff.role === "manager" || currentStaff.role === "admin") return records;
    return records.filter((record) => record.staffId === currentStaff.id);
  }, [records, currentStaff]);

  const normalizedMonth = useMemo(() => {
    if (availableMonths.length === 0) return selectedMonth;
    return availableMonths.includes(selectedMonth) ? selectedMonth : availableMonths[0];
  }, [availableMonths, selectedMonth]);

  const monthlySummary = useMemo(() => buildMonthlySummary(displayRecords, normalizedMonth, staffList, allowances), [displayRecords, normalizedMonth, staffList, allowances]);

  const login = useCallback(
    (pinValue = pin) => {
      if (cloudEnabled && (isCloudLoading || !isInitialized)) {
        setMessage("データを読み込み中です。少しお待ちください。");
        return;
      }

      const normalizedPin = pinValue.trim();
      const staff = staffList.find((item) => item.pin === normalizedPin && item.isActive);

      if (!staff) {
        setMessage(`PIN「${normalizedPin || "未入力"}」は登録されていません`);
        return;
      }

      setCurrentStaff(staff);
      setPin("");
      setMessage("");
    },
    [cloudEnabled, isCloudLoading, isInitialized, pin, staffList],
  );

  const logout = () => {
    setCurrentStaff(null);
    setMessage("ログアウトしました");
  };

  const updateTodayRecord = useCallback(
    async (updater: (record: AttendanceRecord) => AttendanceRecord) => {
      if (!currentStaff) return null;

      const today = getTodayKey();
      const prevRecords = recordsRef.current;
      const existing = prevRecords.find((record) => record.staffId === currentStaff.id && record.workDate === today);
      const baseRecord = existing ? { ...existing } : createEmptyRecord(currentStaff);
      const updated = updater({ ...baseRecord });

      const nextRecords = existing ? prevRecords.map((record) => (record.id === updated.id ? updated : record)) : [updated, ...prevRecords];
      setRecords(nextRecords);
      recordsRef.current = nextRecords;

      if (cloudEnabled) {
        try {
          await upsertAttendanceRecord(updated);
          setCloudError(null);
        } catch (error) {
          handleCloudError(error, "勤務データの保存に失敗しました");
          await refreshRecords();
          return null;
        }
      }

      return updated;
    },
    [cloudEnabled, currentStaff, handleCloudError, refreshRecords],
  );

  const clockIn = useCallback(async () => {
    const now = new Date().toISOString();
    const updated = await updateTodayRecord((record) => ({
      ...record,
      clockIn: record.clockIn ?? now,
      status: "working",
    }));
    if (updated) {
      setMessage("出勤しました");
    }
  }, [updateTodayRecord]);

  const startBreak = useCallback(async () => {
    const now = new Date().toISOString();
    const updated = await updateTodayRecord((record) => ({
      ...record,
      breakStart: now,
      breakEnd: null,
      status: "break",
    }));
    if (updated) {
      setMessage("休憩を開始しました");
    }
  }, [updateTodayRecord]);

  const endBreak = useCallback(async () => {
    const now = new Date().toISOString();
    const updated = await updateTodayRecord((record) => {
      return {
        ...record,
        breakEnd: now,
        totalBreakMinutes: getBreakIntervalMinutes({ breakStart: record.breakStart, breakEnd: now }),
        status: "working",
      };
    });
    if (updated) {
      setMessage("休憩を終了しました");
    }
  }, [updateTodayRecord]);

  const clockOut = useCallback(async () => {
    const now = new Date().toISOString();
    const updated = await updateTodayRecord((record) => ({
      ...record,
      clockOut: now,
      status: "finished",
    }));
    if (updated) {
      setMessage("退勤しました。お疲れさまでした");
    }
  }, [updateTodayRecord]);

  const exportCsv = (staffId: string, month: string) => {
    const filteredRecords = staffId === "all" ? records.filter((r) => r.workDate.startsWith(month)) : records.filter((r) => r.staffId === staffId && r.workDate.startsWith(month));
    const csv = `\uFEFF${recordsToCsv(filteredRecords, staffList, allowances)}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const staffName = staffId === "all" ? "全スタッフ" : (staffList.find((s) => s.id === staffId)?.name ?? staffId);
    link.download = `${staffName}-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const addStaff = useCallback(
    (staff: Omit<Staff, "id" | "isActive">) => {
      const newStaff: Staff = {
        ...staff,
        id: crypto.randomUUID(),
        isActive: true,
      };

      console.log("[スタッフ追加] cloudEnabled:", cloudEnabled);
      console.log("[スタッフ追加] 追加するスタッフ:", newStaff);

      setStaffList((prev) => [...prev, newStaff]);
      setMessage(`${newStaff.name}さんを登録しました`);

      if (cloudEnabled) {
        void (async () => {
          try {
            console.log("[スタッフ追加] Supabase に保存開始...");
            await upsertStaff(newStaff);
            console.log("[スタッフ追加] Supabase に保存成功");
            setCloudError(null);
          } catch (error) {
            console.error("[スタッフ追加] Supabase 保存失敗:", error);
            handleCloudError(error, "スタッフ情報の保存に失敗しました");
            await refreshStaff();
          }
        })();
      } else {
        console.warn("[スタッフ追加] cloudEnabled が false なので Supabase に保存しません（localStorage モード）");
        console.warn("[スタッフ追加] Supabase を使用するには環境変数 NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください");
      }
    },
    [cloudEnabled, handleCloudError, refreshStaff],
  );

  const updateStaff = useCallback(
    (id: string, patch: Partial<Omit<Staff, "id" | "isActive">>) => {
      setStaffList((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
      setMessage("スタッフ情報を更新しました");

      if (cloudEnabled) {
        void (async () => {
          try {
            await updateStaffFields(id, patch);
            setCloudError(null);
          } catch (error) {
            handleCloudError(error, "スタッフ情報の更新に失敗しました");
            await refreshStaff();
          }
        })();
      }
    },
    [cloudEnabled, handleCloudError, refreshStaff],
  );

  const updateAttendanceRecord = useCallback(
    (recordId: string, values: Partial<Pick<AttendanceRecord, CorrectionTimeField>>) => {
      if (!currentStaff) return;

      const updatedRecords = recordsRef.current.map((record) => {
        if (record.id !== recordId) return record;

        const fields: CorrectionTimeField[] = ["clockIn", "clockOut", "breakStart", "breakEnd"];
        const histories: CorrectionHistory[] = fields
          .filter((field) => values[field] !== undefined && values[field] !== null && values[field] !== "" && record[field] !== values[field])
          .map((field) => ({
            id: crypto.randomUUID(),
            recordId: record.id,
            staffId: record.staffId,
            staffName: record.staffName,
            workDate: record.workDate,
            field,
            beforeValue: record[field],
            afterValue: values[field]!,
            correctedBy: currentStaff.name,
            correctedAt: new Date().toISOString(),
            reason: "",
          }));

        if (histories.length > 0) {
          setCorrectionHistories((current) => [...histories, ...current]);
          if (cloudEnabled) {
            void (async () => {
              try {
                await insertCorrectionHistoriesCloud(histories);
                setCloudError(null);
              } catch (error) {
                handleCloudError(error, "修正履歴の保存に失敗しました");
              }
            })();
          }
        }

        const totalBreakMinutes = getBreakIntervalMinutes({
          breakStart: values.breakStart !== undefined ? values.breakStart : record.breakStart,
          breakEnd: values.breakEnd !== undefined ? values.breakEnd : record.breakEnd,
        });

        return {
          ...record,
          ...values,
          totalBreakMinutes,
          status: values.clockOut ? "finished" : record.status,
        };
      });

      setRecords(updatedRecords);
      recordsRef.current = updatedRecords;
      setMessage("打刻を修正しました");

      if (cloudEnabled) {
        const target = updatedRecords.find((item) => item.id === recordId);
        if (target) {
          void (async () => {
            try {
              await upsertAttendanceRecord(target);
              setCloudError(null);
            } catch (error) {
              handleCloudError(error, "勤務データの保存に失敗しました");
              await refreshRecords();
            }
          })();
        }
      }
    },
    [cloudEnabled, currentStaff, handleCloudError, refreshRecords],
  );

  const createAttendanceRecord = useCallback(
    (record: Omit<AttendanceRecord, "workMinutes" | "overtimeMinutes" | "nightMinutes">) => {
      const totalBreakMinutes = getBreakIntervalMinutes(record);
      const newRecord: AttendanceRecord = {
        ...record,
        totalBreakMinutes,
        workMinutes: 0,
        overtimeMinutes: 0,
        nightMinutes: 0,
      };
      const nextRecords = [newRecord, ...recordsRef.current];
      const createdAt = new Date().toISOString();
      const creationHistories: CorrectionHistory[] = (["clockIn", "clockOut", "breakStart", "breakEnd"] as CorrectionTimeField[])
        .filter((field) => newRecord[field] !== null)
        .map((field) => ({
          id: crypto.randomUUID(),
          recordId: newRecord.id,
          staffId: newRecord.staffId,
          staffName: newRecord.staffName,
          workDate: newRecord.workDate,
          field,
          beforeValue: null,
          afterValue: newRecord[field],
          correctedBy: currentStaff?.name ?? "",
          correctedAt: createdAt,
          reason: "勤務追加",
        }));
      setRecords(nextRecords);
      recordsRef.current = nextRecords;
      setCorrectionHistories((current) => [...creationHistories, ...current]);
      setMessage("勤務履歴を作成しました");

      if (cloudEnabled) {
        void (async () => {
          try {
            await upsertAttendanceRecord(newRecord);
            await insertCorrectionHistoriesCloud(creationHistories);
            setCloudError(null);
          } catch (error) {
            handleCloudError(error, "勤務データまたは修正履歴の保存に失敗しました");
            await refreshRecords();
            await refreshCorrections();
          }
        })();
      }
    },
    [cloudEnabled, currentStaff, handleCloudError, refreshCorrections, refreshRecords],
  );

  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#3e2723]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        {!currentStaff ? (
          <LoginPanel pin={pin} message={message} onPinChange={setPin} onLogin={login} />
        ) : (
          <section className={`flex flex-col gap-5 ${currentStaff.role === "admin" || currentStaff.role === "manager" ? "pt-16 lg:pt-0" : ""}`}>
            <AttendanceCard
              staff={currentStaff}
              record={currentRecord}
              message={message}
              onLogout={logout}
              onClockIn={clockIn}
              onClockOut={clockOut}
              onStartBreak={startBreak}
              onEndBreak={endBreak}
            />
            <AdminPanel
              isAdmin={currentStaff.role === "admin" || currentStaff.role === "manager"}
              currentStaff={currentStaff}
              staffList={staffList}
              records={displayRecords}
              correctionHistories={correctionHistories}
              selectedMonth={selectedMonth}
              monthlySummary={monthlySummary}
              allowances={allowances}
              onMonthChange={setSelectedMonth}
              onExportCsv={exportCsv}
              onAddStaff={addStaff}
              onUpdateStaff={updateStaff}
              onDeleteStaff={(id) => {
                setStaffList((prev) => prev.filter((item) => item.id !== id));
                setMessage("スタッフを削除しました");

                if (cloudEnabled) {
                  void (async () => {
                    try {
                      await deleteStaffCloud(id);
                      setCloudError(null);
                    } catch (error) {
                      handleCloudError(error, "スタッフの削除に失敗しました");
                      await refreshStaff();
                    }
                  })();
                }
              }}
              onUpdateRecord={updateAttendanceRecord}
              onCreateRecord={createAttendanceRecord}
              onDeleteRecord={async (id) => {
                const recordToDelete = recordsRef.current.find((item) => item.id === id);
                if (!recordToDelete) return;
                const deletedAt = new Date().toISOString();
                const deletionHistory: CorrectionHistory = {
                  id: crypto.randomUUID(),
                  recordId: recordToDelete.id,
                  staffId: recordToDelete.staffId,
                  staffName: recordToDelete.staffName,
                  workDate: recordToDelete.workDate,
                  field: "dayDeletion",
                  beforeValue: JSON.stringify({
                    clockIn: recordToDelete.clockIn,
                    clockOut: recordToDelete.clockOut,
                    breakStart: recordToDelete.breakStart,
                    breakEnd: recordToDelete.breakEnd,
                  }),
                  afterValue: null,
                  correctedBy: currentStaff.name,
                  correctedAt: deletedAt,
                  reason: "勤務削除",
                };

                try {
                  if (cloudEnabled) {
                    await insertCorrectionHistoriesCloud([deletionHistory]);
                    await deleteAttendanceRecordCloud(id);
                  }

                  const nextRecords = recordsRef.current.filter((item) => item.id !== id);
                  recordsRef.current = nextRecords;
                  setRecords(nextRecords);
                  setCorrectionHistories((prev) => [deletionHistory, ...prev]);
                  setMessage("選択した勤務データを削除しました");
                  setCloudError(null);
                } catch (error) {
                  handleCloudError(error, "選択した勤務データの削除に失敗しました");
                  await refreshRecords();
                  await refreshCorrections();
                  throw error;
                }
              }}
              onAddAllowance={(allowance) => {
                const newAllowance = { ...allowance, id: crypto.randomUUID() };
                setAllowances((prev) => [...prev, newAllowance]);
                setMessage(`手当「${allowance.name}」を登録しました`);

                if (cloudEnabled) {
                  void (async () => {
                    try {
                      await insertAllowanceCloud(newAllowance);
                      setCloudError(null);
                    } catch (error) {
                      handleCloudError(error, "特別手当の保存に失敗しました");
                      await refreshAllowances();
                    }
                  })();
                }
              }}
              onDeleteAllowance={(id) => {
                setAllowances((prev) => prev.filter((item) => item.id !== id));
                setMessage("手当を削除しました");

                if (cloudEnabled) {
                  void (async () => {
                    try {
                      await deleteAllowanceCloud(id);
                      setCloudError(null);
                    } catch (error) {
                      handleCloudError(error, "特別手当の削除に失敗しました");
                      await refreshAllowances();
                    }
                  })();
                }
              }}
            />
          </section>
        )}
      </div>
    </main>
  );
}
