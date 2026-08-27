import React, { useState, useEffect, useMemo } from "react";
import {
  getProvinces,
  getDistricts,
  getSubdistricts,
  getZipcode,
  searchThaiAddress,
  formatFullAddress,
  parseAddressString,
  StructuredAddress,
  ThaiAddressItem,
} from "@/lib/thaiAddress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Search,
  Check,
  ChevronsUpDown,
  Home,
  Building,
  Sparkles,
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

  // Quick search
  const [searchQuery, setSearchQuery] = useState("");
  const [openQuickSearch, setOpenQuickSearch] = useState(false);

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

  // Quick search results
  const quickSearchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    return searchThaiAddress(searchQuery, 15);
  }, [searchQuery]);

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

  const handleQuickSelect = (item: ThaiAddressItem) => {
    setProvince(item.province);
    setDistrict(item.district);
    setSubdistrict(item.subdistrict);
    setZipcode(item.zipcode);
    setSearchQuery("");
    setOpenQuickSearch(false);
    notifyChange({
      province: item.province,
      district: item.district,
      subdistrict: item.subdistrict,
      zipcode: item.zipcode,
    });
  };

  const isBKK = province.includes("กรุงเทพ");

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card/60 p-4 sm:p-5 shadow-sm backdrop-blur-sm">
      {/* Header & Quick Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2 text-primary font-medium">
          <MapPin className="w-4 h-4" />
          <span>ข้อมูลที่อยู่สำหรับจัดส่ง (ระบบระบุตำแหน่งอัตโนมัติ)</span>
        </div>
        
        {/* Fast Auto-complete button / popover */}
        <Popover open={openQuickSearch} onOpenChange={setOpenQuickSearch}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-background/80"
              disabled={disabled}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>ค้นหาด่วน (ตำบล/อำเภอ/รหัส)</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] sm:w-[380px] p-0" align="end">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="พิมพ์ชื่อตำบล อำเภอ จังหวัด หรือ รหัสไปรษณีย์..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-60">
                {searchQuery.length < 2 && (
                  <div className="py-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
                    <Search className="w-4 h-4 text-muted-foreground/60" />
                    <span>พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา</span>
                  </div>
                )}
                {searchQuery.length >= 2 && quickSearchResults.length === 0 && (
                  <CommandEmpty>ไม่พบข้อมูลที่อยู่</CommandEmpty>
                )}
                {quickSearchResults.length > 0 && (
                  <CommandGroup heading="ผลการค้นหาที่อยู่">
                    {quickSearchResults.map((item, idx) => (
                      <CommandItem
                        key={`${item.subdistrict}-${item.district}-${item.province}-${idx}`}
                        onSelect={() => handleQuickSelect(item)}
                        className="cursor-pointer py-2 text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {item.province.includes("กรุงเทพ") ? "แขวง" : "ต."}{item.subdistrict} &rsaquo; {item.province.includes("กรุงเทพ") ? "เขต" : "อ."}{item.district}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {item.province.includes("กรุงเทพ") ? "" : "จ."}{item.province} &bull; รหัส {item.zipcode}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 1: Detailed Address (House No, Village/Moo, Soi, Road) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">บ้านเลขที่ *</Label>
          <Input
            placeholder="เช่น 123/45"
            value={houseNumber}
            disabled={disabled}
            className="mt-1 h-9 text-sm"
            onChange={(e) => {
              setHouseNumber(e.target.value);
              notifyChange({ houseNumber: e.target.value });
            }}
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">หมู่ที่ / อาคาร</Label>
          <Input
            placeholder="เช่น 2 หรือ อาคาร A"
            value={moo}
            disabled={disabled}
            className="mt-1 h-9 text-sm"
            onChange={(e) => {
              setMoo(e.target.value);
              notifyChange({ moo: e.target.value });
            }}
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">ซอย</Label>
          <Input
            placeholder="เช่น สุขุมวิท 55"
            value={soi}
            disabled={disabled}
            className="mt-1 h-9 text-sm"
            onChange={(e) => {
              setSoi(e.target.value);
              notifyChange({ soi: e.target.value });
            }}
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">ถนน</Label>
          <Input
            placeholder="เช่น สุขุมวิท"
            value={road}
            disabled={disabled}
            className="mt-1 h-9 text-sm"
            onChange={(e) => {
              setRoad(e.target.value);
              notifyChange({ road: e.target.value });
            }}
          />
        </div>
      </div>

      {/* Optional Details Line (e.g. Landmark / Additional Instructions) */}
      <div>
        <Label className="text-xs text-muted-foreground">
          รายละเอียดเพิ่มเติม (เช่น ชื่อหมู่บ้าน, คอนโด, จุดสังเกต)
        </Label>
        <Input
          placeholder="เช่น หมู่บ้านพฤกษา 3 หลังมุม ติดร้านสะดวกซื้อ"
          value={detail}
          disabled={disabled}
          className="mt-1 h-9 text-sm"
          onChange={(e) => {
            setDetail(e.target.value);
            notifyChange({ detail: e.target.value });
          }}
        />
      </div>

      {/* Row 2: Cascading Selects: Province, District, Subdistrict, Postal Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
        {/* 1. จังหวัด (Province) */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">จังหวัด *</Label>
          <Popover open={openProvince} onOpenChange={setOpenProvince}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openProvince}
                disabled={disabled}
                className="w-full h-9 justify-between font-normal text-sm bg-background px-3"
              >
                <span className="truncate">
                  {province || "เลือกจังหวัด"}
                </span>
                <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
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
          <Label className="text-xs text-muted-foreground">
            {isBKK ? "เขต" : "อำเภอ / เขต"} *
          </Label>
          <Popover open={openDistrict} onOpenChange={setOpenDistrict}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openDistrict}
                disabled={disabled || !province}
                className="w-full h-9 justify-between font-normal text-sm bg-background px-3"
              >
                <span className="truncate">
                  {district || (province ? `เลือก${isBKK ? "เขต" : "อำเภอ"}` : "เลือกจังหวัดก่อน")}
                </span>
                <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
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
          <Label className="text-xs text-muted-foreground">
            {isBKK ? "แขวง" : "ตำบล / แขวง"} *
          </Label>
          <Popover open={openSubdistrict} onOpenChange={setOpenSubdistrict}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openSubdistrict}
                disabled={disabled || !district}
                className="w-full h-9 justify-between font-normal text-sm bg-background px-3"
              >
                <span className="truncate">
                  {subdistrict || (district ? `เลือก${isBKK ? "แขวง" : "ตำบล"}` : "เลือกอำเภอก่อน")}
                </span>
                <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
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
          <Label className="text-xs text-muted-foreground">รหัสไปรษณีย์ *</Label>
          <Input
            placeholder="รหัสไปรษณีย์"
            value={zipcode}
            disabled={disabled}
            maxLength={5}
            className="h-9 text-sm bg-muted/40 font-mono"
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 5);
              setZipcode(val);
              notifyChange({ zipcode: val });
            }}
          />
        </div>
      </div>

      {/* Live Formatted Address Preview Box */}
      <div className="rounded-lg bg-muted/40 border border-border/50 p-3 text-xs space-y-1">
        <div className="text-muted-foreground font-medium flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>ตัวอย่างที่อยู่จัดส่งที่แสดง:</span>
        </div>
        <p className="text-foreground font-medium leading-relaxed pl-5">
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
