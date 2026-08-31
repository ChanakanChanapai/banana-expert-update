import React, { useState, useEffect, useMemo } from "react";
import {
  getProvinces,
  getDistricts,
  getSubdistricts,
  getZipcode,
  formatFullAddress,
  parseAddressString,
  StructuredAddress,
} from "@/lib/thaiAddress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Check,
  ChevronsUpDown,
  Info,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface ThaiAddressSelectorProps {
  value: string; // The full address string
  onChange: (fullAddress: string, structured: StructuredAddress) => void;
  label?: string;
  disabled?: boolean;
}

export const ThaiAddressSelector: React.FC<ThaiAddressSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  // Address field states
  const [houseNumber, setHouseNumber] = useState("");
  const [moo, setMoo] = useState("");
  const [soi, setSoi] = useState("");
  const [road, setRoad] = useState("");
  const [detail, setDetail] = useState("");

  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [zipcode, setZipcode] = useState("");

  // Popover open states for comboboxes
  const [openProvince, setOpenProvince] = useState(false);
  const [openDistrict, setOpenDistrict] = useState(false);
  const [openSubdistrict, setOpenSubdistrict] = useState(false);

  // Initialize from existing value on mount or when value externally changes (if structured fields are empty)
  useEffect(() => {
    if (value && (!province || !subdistrict)) {
      const parsed = parseAddressString(value);
      if (parsed.province) setProvince(parsed.province);
      if (parsed.district) setDistrict(parsed.district);
      if (parsed.subdistrict) setSubdistrict(parsed.subdistrict);
      if (parsed.zipcode) setZipcode(parsed.zipcode);
      if (parsed.houseNumber) setHouseNumber(parsed.houseNumber);
      if (parsed.moo) setMoo(parsed.moo);
      if (parsed.soi) setSoi(parsed.soi);
      if (parsed.road) setRoad(parsed.road);
      if (parsed.detail) setDetail(parsed.detail);
    }
  }, [value]);

  // Derived lists
  const provinces = useMemo(() => getProvinces(), []);
  const districts = useMemo(() => getDistricts(province), [province]);
  const subdistricts = useMemo(
    () => getSubdistricts(province, district),
    [province, district]
  );

  // Notify parent whenever fields change
  const notifyChange = (updated: Partial<StructuredAddress>) => {
    const current: StructuredAddress = {
      houseNumber: updated.houseNumber !== undefined ? updated.houseNumber : houseNumber,
      moo: updated.moo !== undefined ? updated.moo : moo,
      soi: updated.soi !== undefined ? updated.soi : soi,
      road: updated.road !== undefined ? updated.road : road,
      detail: updated.detail !== undefined ? updated.detail : detail,
      province: updated.province !== undefined ? updated.province : province,
      district: updated.district !== undefined ? updated.district : district,
      subdistrict: updated.subdistrict !== undefined ? updated.subdistrict : subdistrict,
      zipcode: updated.zipcode !== undefined ? updated.zipcode : zipcode,
    };

    const full = formatFullAddress(current);
    onChange(full, current);
  };

  // Handlers
  const handleSelectProvince = (prov: string) => {
    setProvince(prov);
    setDistrict("");
    setSubdistrict("");
    setZipcode("");
    setOpenProvince(false);
    notifyChange({
      province: prov,
      district: "",
      subdistrict: "",
      zipcode: "",
    });
  };

  const handleSelectDistrict = (dist: string) => {
    setDistrict(dist);
    setSubdistrict("");
    setZipcode("");
    setOpenDistrict(false);
    notifyChange({
      district: dist,
      subdistrict: "",
      zipcode: "",
    });
  };

  const handleSelectSubdistrict = (sub: string, zip: string) => {
    setSubdistrict(sub);
    const resolvedZip = zip || getZipcode(province, district, sub);
    setZipcode(resolvedZip);
    setOpenSubdistrict(false);
    notifyChange({
      subdistrict: sub,
      zipcode: resolvedZip,
    });
  };

  const isBKK = province.includes("กรุงเทพ");

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-card/70 p-4 sm:p-5 shadow-sm backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2.5 border-b border-border/60 text-slate-800 dark:text-slate-200">
        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="font-bold text-sm sm:text-base">ข้อมูลที่อยู่สำหรับจัดส่ง</span>
      </div>

      {/* 🏡 Section 1: ข้อมูลบ้านเลขที่ / ถนน / อาคาร */}
      <div className="space-y-3">
        {/* Row 1: บ้านเลขที่ & หมู่ที่ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              บ้านเลขที่ <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="บ้านเลขที่ / ห้องเลขที่"
              value={houseNumber}
              disabled={disabled}
              className="mt-1 h-9 text-sm rounded-xl"
              onChange={(e) => {
                setHouseNumber(e.target.value);
                notifyChange({ houseNumber: e.target.value });
              }}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              หมู่ที่ / อาคาร
            </Label>
            <Input
              placeholder="หมู่ที่ / ชื่ออาคาร"
              value={moo}
              disabled={disabled}
              className="mt-1 h-9 text-sm rounded-xl"
              onChange={(e) => {
                setMoo(e.target.value);
                notifyChange({ moo: e.target.value });
              }}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              ซอย
            </Label>
            <Input
              placeholder="ชื่อซอย"
              value={soi}
              disabled={disabled}
              className="mt-1 h-9 text-sm rounded-xl"
              onChange={(e) => {
                setSoi(e.target.value);
                notifyChange({ soi: e.target.value });
              }}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              ถนน
            </Label>
            <Input
              placeholder="ชื่อถนน"
              value={road}
              disabled={disabled}
              className="mt-1 h-9 text-sm rounded-xl"
              onChange={(e) => {
                setRoad(e.target.value);
                notifyChange({ road: e.target.value });
              }}
            />
          </div>
        </div>

        {/* Row 2: รายละเอียดเพิ่มเติม / จุดสังเกต */}
        <div>
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            รายละเอียดเพิ่มเติม (ชื่อหมู่บ้าน, คอนโด, จุดสังเกต)
          </Label>
          <Input
            placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
            value={detail}
            disabled={disabled}
            className="mt-1 h-9 text-sm rounded-xl"
            onChange={(e) => {
              setDetail(e.target.value);
              notifyChange({ detail: e.target.value });
            }}
          />
        </div>
      </div>

      {/* 🗺️ Section 2: จังหวัด, อำเภอ/เขต, ตำบล/แขวง, รหัสไปรษณีย์ */}
      <div className="pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. จังหวัด (Province) */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              จังหวัด <span className="text-destructive">*</span>
            </Label>
            <Popover open={openProvince} onOpenChange={setOpenProvince}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openProvince}
                  disabled={disabled}
                  className="w-full h-9 justify-between font-normal text-sm bg-background px-3 rounded-xl border-input"
                >
                  <span className="truncate">
                    {province || "เลือกจังหวัด"}
                  </span>
                  <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0 dropdown-panel shadow-xl" align="start">
                <Command>
                  <CommandInput placeholder="ค้นหาจังหวัด..." />
                  <CommandList className="max-h-56">
                    <CommandEmpty>ไม่พบจังหวัด</CommandEmpty>
                    <CommandGroup>
                      {provinces.map((prov) => (
                        <CommandItem
                          key={prov}
                          value={prov}
                          onSelect={() => handleSelectProvince(prov)}
                          className="cursor-pointer text-xs"
                        >
                          <Check
                            className={`mr-2 h-3.5 w-3.5 ${
                              province === prov ? "opacity-100 text-primary" : "opacity-0"
                            }`}
                          />
                          {prov}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* 2. อำเภอ / เขต (District) */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isBKK ? "เขต" : "อำเภอ / เขต"} <span className="text-destructive">*</span>
            </Label>
            <Popover open={openDistrict} onOpenChange={setOpenDistrict}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openDistrict}
                  disabled={disabled || !province}
                  className="w-full h-9 justify-between font-normal text-sm bg-background px-3 rounded-xl border-input"
                >
                  <span className="truncate">
                    {district || (province ? `เลือก${isBKK ? "เขต" : "อำเภอ"}` : "เลือกจังหวัดก่อน")}
                  </span>
                  <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0 dropdown-panel shadow-xl" align="start">
                <Command>
                  <CommandInput placeholder={`ค้นหา${isBKK ? "เขต" : "อำเภอ"}...`} />
                  <CommandList className="max-h-56">
                    <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
                    <CommandGroup>
                      {districts.map((dist) => (
                        <CommandItem
                          key={dist}
                          value={dist}
                          onSelect={() => handleSelectDistrict(dist)}
                          className="cursor-pointer text-xs"
                        >
                          <Check
                            className={`mr-2 h-3.5 w-3.5 ${
                              district === dist ? "opacity-100 text-primary" : "opacity-0"
                            }`}
                          />
                          {dist}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* 3. ตำบล / แขวง (Subdistrict) */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isBKK ? "แขวง" : "ตำบล / แขวง"} <span className="text-destructive">*</span>
            </Label>
            <Popover open={openSubdistrict} onOpenChange={setOpenSubdistrict}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSubdistrict}
                  disabled={disabled || !district}
                  className="w-full h-9 justify-between font-normal text-sm bg-background px-3 rounded-xl border-input"
                >
                  <span className="truncate">
                    {subdistrict || (district ? `เลือก${isBKK ? "แขวง" : "ตำบล"}` : "เลือกอำเภอก่อน")}
                  </span>
                  <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0 dropdown-panel shadow-xl" align="start">
                <Command>
                  <CommandInput placeholder={`ค้นหา${isBKK ? "แขวง" : "ตำบล"}...`} />
                  <CommandList className="max-h-56">
                    <CommandEmpty>ไม่พบข้อมูล</CommandEmpty>
                    <CommandGroup>
                      {subdistricts.map((item) => (
                        <CommandItem
                          key={item.subdistrict}
                          value={`${item.subdistrict} ${item.zipcode}`}
                          onSelect={() => handleSelectSubdistrict(item.subdistrict, item.zipcode)}
                          className="cursor-pointer text-xs flex justify-between"
                        >
                          <div className="flex items-center">
                            <Check
                              className={`mr-2 h-3.5 w-3.5 ${
                                subdistrict === item.subdistrict ? "opacity-100 text-primary" : "opacity-0"
                              }`}
                            />
                            <span>{item.subdistrict}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">{item.zipcode}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* 4. รหัสไปรษณีย์ (Zipcode) - Auto filled */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              รหัสไปรษณีย์ <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="รหัสไปรษณีย์"
              value={zipcode}
              disabled={disabled}
              maxLength={5}
              className="h-9 text-sm bg-muted/40 font-mono rounded-xl"
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                setZipcode(val);
                notifyChange({ zipcode: val });
              }}
            />
          </div>
        </div>
      </div>

      {/* 📄 Live Formatted Address Preview Box */}
      <div className="rounded-xl bg-amber-50/50 dark:bg-slate-800/40 border border-amber-200/60 dark:border-slate-700/60 p-3.5 text-xs space-y-1.5">
        <div className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>ตัวอย่างที่อยู่จัดส่งที่แสดง:</span>
        </div>
        <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed pl-5">
          {formatFullAddress({
            houseNumber,
            moo,
            soi,
            road,
            detail,
            subdistrict,
            district,
            province,
            zipcode,
          }) || (
            <span className="text-muted-foreground italic">
              (กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วน)
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default ThaiAddressSelector;
