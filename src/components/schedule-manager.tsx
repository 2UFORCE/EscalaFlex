"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Briefcase, Home, Plane, Sparkles, MoreVertical, Trash2, Pencil, Bot, Repeat } from 'lucide-react';

import useLocalStorage from '@/hooks/use-local-storage';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { type ShiftPattern, type Overrides, type ShiftType, SHIFT_TYPES, getDayInfo, type DayInfo } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { suggestPatternAdjustments, type SuggestPatternAdjustmentsOutput } from '@/ai/flows/suggest-pattern-adjustments';
import { AppLogo } from '@/components/icons';
import { SHIFT_CONFIG } from '@/lib/config';
import { LOCAL_STORAGE_PATTERN_KEY, LOCAL_STORAGE_OVERRIDES_KEY } from '@/lib/constants';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from "@/hooks/use-toast";
import { MonthlySummary } from '@/components/monthly-summary';


// Main Component
export function ScheduleManager() {
  const [pattern, setPattern] = useLocalStorage<ShiftPattern | null>(LOCAL_STORAGE_PATTERN_KEY, null);

  const handleSavePattern = (newPattern: ShiftPattern) => {
    setPattern(newPattern);
  };

  const handleResetApp = () => {
    if (window.confirm("Você tem certeza que quer apagar todos os dados? Esta ação não pode ser desfeita.")) {
      localStorage.removeItem(LOCAL_STORAGE_PATTERN_KEY);
      localStorage.removeItem(LOCAL_STORAGE_OVERRIDES_KEY);
      setPattern(null);
    }
  };

  if (!pattern) {
    return <SchedulePatternForm onSave={handleSavePattern} />;
  }

  return <ScheduleDashboard pattern={pattern} onReset={handleResetApp} setPattern={setPattern} />;
}

// Sub-component: Initial Setup Form
const patternFormSchema = z.object({
  work: z.coerce.number().min(1, "Deve ser no mínimo 1"),
  off: z.coerce.number().min(1, "Deve ser no mínimo 1"),
  startDate: z.date({ required_error: "A data de início é obrigatória." }),
});

function SchedulePatternForm({ onSave }: { onSave: (pattern: ShiftPattern) => void }) {
  const form = useForm<z.infer<typeof patternFormSchema>>({
    resolver: zodResolver(patternFormSchema),
    defaultValues: { work: 1, off: 1 },
  });

  function onSubmit(values: z.infer<typeof patternFormSchema>) {
    onSave({
      ...values,
      startDate: format(values.startDate, 'yyyy-MM-dd'),
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <AppLogo className="h-8 w-8 text-primary" />
            Bem-vindo ao EscalaFlex!
          </CardTitle>
          <div className="text-muted-foreground">Vamos configurar sua escala de trabalho.</div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <p className="text-sm text-foreground">Defina seu padrão de turnos rotativos:</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="work" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dias de Trabalho</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="off" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dias de Folga</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Início do Ciclo</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full">Salvar e Começar</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-component: Main Dashboard
function ScheduleDashboard({ pattern, onReset, setPattern }: { pattern: ShiftPattern; onReset: () => void; setPattern: (pattern: ShiftPattern) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [overrides, setOverrides] = useLocalStorage<Overrides>(LOCAL_STORAGE_OVERRIDES_KEY, {});

  const scheduleDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end }).map(day => {
      const dayInfo = getDayInfo(day, pattern, overrides);
      return { ...dayInfo, isCurrentMonth: true };
    });
  }, [currentMonth, pattern, overrides]);

  const handleSaveOverride = (date: Date, override: ShiftOverride | null) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setOverrides(prev => {
      const newOverrides = { ...prev };
      if (override) {
        newOverrides[dateKey] = override;
      } else {
        delete newOverrides[dateKey];
      }
      return newOverrides;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <AppLogo className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold font-headline">EscalaFlex</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
           <PatternOptimizerDialog pattern={pattern} overrides={overrides} onApplyPattern={setPattern} />
          <AddVacationDialog onSaveVacation={handleSaveOverride} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onReset} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Resetar App</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <Card className="shadow-md">
          <CardContent className="p-2 sm:p-4">
             <Calendar
              mode="single"
              selected={new Date()}
              onSelect={() => {}}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ptBR}
              className="w-full"
              components={{
                Day: ({ date }) => {
                  const dayInfo = scheduleDays.find(d => isSameDay(d.date, date));
                  return <DayCell dayInfo={dayInfo} onSaveOverride={handleSaveOverride} />;
                },
              }}
            />
          </CardContent>
        </Card>
        
        <MonthlySummary scheduleDays={scheduleDays} />
      </main>
    </div>
  );
}

// Sub-component: Day Cell in Calendar
function DayCell({ dayInfo, onSaveOverride }: { dayInfo?: DayInfo; onSaveOverride: (date: Date, override: ShiftOverride | null) => void }) {
  if (!dayInfo) return <div />;

  const dayNumber = format(dayInfo.date, 'd');
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div
          className={cn(
            "relative w-full h-full p-1 flex flex-col items-center justify-center rounded-md cursor-pointer hover:bg-muted/50 transition-colors aspect-square",
            dayInfo.isToday && "ring-2 ring-accent",
          )}
        >
          <time dateTime={format(dayInfo.date, 'yyyy-MM-dd')} className="text-sm font-medium">{dayNumber}</time>
          {dayInfo.type !== 'Empty' && (
            <div className={cn("mt-1 text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1", SHIFT_CONFIG[dayInfo.type].className)}>
              {React.createElement(SHIFT_CONFIG[dayInfo.type].icon, { className: "w-3 h-3" })}
              <span className="hidden sm:inline">{dayInfo.type}</span>
            </div>
          )}
          {dayInfo.isOverride && <div className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" title="Dia modificado"></div>}
        </div>
      </DialogTrigger>
      <EditDayDialog dayInfo={dayInfo} onSave={onSaveOverride} />
    </Dialog>
  );
}


// Sub-component: Edit Day Dialog
const editDaySchema = z.object({
  type: z.nativeEnum(SHIFT_TYPES),
  note: z.string().optional(),
});

function EditDayDialog({ dayInfo, onSave }: { dayInfo: DayInfo; onSave: (date: Date, override: ShiftOverride | null) => void }) {
  const { toast } = useToast();
  const defaultType = dayInfo.type === 'Empty' ? SHIFT_TYPES.WORK : dayInfo.type;
  const form = useForm<z.infer<typeof editDaySchema>>({
    resolver: zodResolver(editDaySchema),
    defaultValues: { type: defaultType, note: dayInfo.note },
  });

  const onSubmit = (values: z.infer<typeof editDaySchema>) => {
    onSave(dayInfo.date, values);
    toast({ title: "Dia atualizado!", description: `A escala de ${format(dayInfo.date, "PPP", { locale: ptBR })} foi salva.` });
  };
  
  const handleResetDay = () => {
    onSave(dayInfo.date, null);
    toast({ title: "Dia redefinido!", description: `A escala de ${format(dayInfo.date, "PPP", { locale: ptBR })} voltou ao padrão.` });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar dia: {format(dayInfo.date, 'PPP', { locale: ptBR })}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tipo de Turno</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                  {Object.values(SHIFT_TYPES).map((type) => (
                    <FormItem key={type} className="flex items-center space-x-3 space-y-0">
                      <FormControl><RadioGroupItem value={type} /></FormControl>
                      <FormLabel className="font-normal">{type}</FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="note" render={({ field }) => (
            <FormItem>
              <FormLabel>Anotação</FormLabel>
              <FormControl><Textarea placeholder="Ex: Troca com colega, consulta médica..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <DialogFooter className="sm:justify-between pt-4">
            <DialogClose asChild>
                <Button type="button" variant="ghost" onClick={handleResetDay} className={cn(!dayInfo.isOverride && 'invisible')}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Resetar para Padrão
                </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button type="submit">Salvar Alterações</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}



// Sub-component: Add Vacation Dialog
const vacationFormSchema = z.object({
  startDate: z.date({ required_error: "A data de início é obrigatória." }),
  endDate: z.date({ required_error: "A data de término é obrigatória." }),
}).refine((data) => data.endDate >= data.startDate, {
  message: "A data de término não pode ser anterior à data de início.",
  path: ["endDate"],
});

function AddVacationDialog({ onSaveVacation }: { onSaveVacation: (date: Date, override: ShiftOverride | null) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof vacationFormSchema>>({
    resolver: zodResolver(vacationFormSchema),
  });

  const onSubmit = (values: z.infer<typeof vacationFormSchema>) => {
    let currentDate = values.startDate;
    while (currentDate <= values.endDate) {
      onSaveVacation(currentDate, { type: SHIFT_TYPES.VACATION, note: "Férias" });
      currentDate = addDays(currentDate, 1);
    }
    toast({ title: "Férias adicionadas!", description: `O período de férias de ${format(values.startDate, "PPP", { locale: ptBR })} a ${format(values.endDate, "PPP", { locale: ptBR })} foi salvo.` });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plane className="mr-2 h-4 w-4" />
          Adicionar Férias
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Período de Férias</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="startDate" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Início</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR} />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="endDate" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Término</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR} />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="submit">Adicionar Férias</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PatternOptimizerDialog({ pattern, overrides, onApplyPattern }: { pattern: ShiftPattern, overrides: Overrides, onApplyPattern: (newPattern: ShiftPattern) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SuggestPatternAdjustmentsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictDescription, setConflictDescription] = useState<string | null>(null);
  const { toast } = useToast();
  const isOnline = useOnlineStatus();

  const handleOptimization = async () => {
    if (!isOnline) {
      toast({
        variant: "destructive",
        title: "Você está offline",
        description: "A otimização com IA requer uma conexão com a internet.",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const originalSchedulePattern = `Padrão atual: ${pattern.work} dias de trabalho por ${pattern.off} dias de folga. O ciclo começou em ${format(new Date(pattern.startDate), 'PPP', { locale: ptBR })}.`;
    const editedSchedule = Object.entries(overrides)
      .map(([date, override]) => `- ${format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })}: alterado para ${override.type}. Anotação: ${override.note || 'N/A'}`)
      .join('\n');
    
    if (Object.keys(overrides).length === 0) {
        toast({
            variant: "destructive",
            title: "Nenhuma alteração encontrada",
            description: "Faça algumas edições na sua escala antes de pedir uma otimização."
        })
        setIsLoading(false);
        return;
    }

    try {
      const res = await suggestPatternAdjustments({ originalSchedulePattern, editedSchedule, conflictDescription });
      setResult(res);
    } catch (e) {
      console.error(e);
      let errorMessage = 'Ocorreu um erro ao contatar a IA. Tente novamente mais tarde.';
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerButton = (
    <Button variant="outline" disabled={!isOnline}>
      <Bot className="mr-2 h-4 w-4" />
      Otimizar Padrão
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {isOnline ? (
          triggerButton
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
              <TooltipContent>
                <p>Função de IA requer conexão com a internet.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Otimizador de Padrão com IA</DialogTitle>
          <div className="text-sm text-muted-foreground pt-1">
            Nossa IA irá analisar suas edições manuais e sugerir um novo padrão de escala para minimizar futuras alterações.
          </div>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center space-y-4 h-48">
                <LoadingSpinner className="h-10 w-10 text-primary" />
                <p className="text-muted-foreground">Analisando sua escala...</p>
             </div>
          ) : error ? (
            <div className="text-destructive text-center p-4 bg-destructive/10 rounded-md">{error}</div>
          ) : result ? (
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold text-foreground">Ajustes Sugeridos</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.suggestedAdjustments}</p>
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">Justificativa</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.optimizationRationale}</p>
                </div>
                {result.conflictResolutionOptions && result.conflictResolutionOptions.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">Opções de Resolução de Conflitos</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.conflictResolutionOptions.map((option, index) => (
                        <Button key={index} variant="outline" onClick={() => {
                          setConflictDescription(option);
                          handleOptimization();
                        }}>
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
             <div className="text-center text-muted-foreground p-4">
                Clique no botão abaixo para iniciar a otimização.
             </div>
          )}
        </div>
        <DialogFooter>
          {result && result.newPattern ? (
            <div className="flex gap-2">
              <Button onClick={() => onApplyPattern({ ...pattern, ...result.newPattern! })}>
                Aplicar Novo Padrão
              </Button>
              <Button onClick={() => { setResult(null); setError(null); setConflictDescription(null); }}>Analisar Novamente</Button>
            </div>
          ) : result ? (
            <Button onClick={() => { setResult(null); setError(null); setConflictDescription(null); }}>Analisar Novamente</Button>
          ) : (
            <Button onClick={handleOptimization} disabled={isLoading || !isOnline}>
              {isLoading ? 'Analisando...' : 'Sugerir Novo Padrão'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}