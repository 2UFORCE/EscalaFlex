"use client";

import { useState, useMemo, useCallback } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Briefcase, Home, Plane, Sparkles, MoreVertical, Trash2, Pencil, Bot } from 'lucide-react';

import useLocalStorage from '@/hooks/use-local-storage';
import { type ShiftPattern, type Overrides, type ShiftType, SHIFT_TYPES, getDayInfo, type DayInfo } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { suggestPatternAdjustments, type SuggestPatternAdjustmentsOutput } from '@/ai/flows/suggest-pattern-adjustments';
import { AppLogo } from '@/components/icons';
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
import { useToast } from "@/hooks/use-toast";


// Main Component
export function ScheduleManager() {
  const [pattern, setPattern] = useLocalStorage<ShiftPattern | null>('escala-flex-pattern', null);

  const handleSavePattern = (newPattern: ShiftPattern) => {
    setPattern(newPattern);
  };

  const handleResetApp = () => {
    if (window.confirm("Você tem certeza que quer apagar todos os dados? Esta ação não pode ser desfeita.")) {
      localStorage.removeItem('escala-flex-pattern');
      localStorage.removeItem('escala-flex-overrides');
      setPattern(null);
    }
  };

  if (!pattern) {
    return <SchedulePatternForm onSave={handleSavePattern} />;
  }

  return <ScheduleDashboard pattern={pattern} onReset={handleResetApp} />;
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
function ScheduleDashboard({ pattern, onReset }: { pattern: ShiftPattern; onReset: () => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [overrides, setOverrides] = useLocalStorage<Overrides>('escala-flex-overrides', {});

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

  const shiftIcons: Record<ShiftType, React.ReactNode> = {
    [SHIFT_TYPES.WORK]: <Briefcase className="h-4 w-4" />,
    [SHIFT_TYPES.OFF]: <Home className="h-4 w-4" />,
    [SHIFT_TYPES.VACATION]: <Plane className="h-4 w-4" />,
    [SHIFT_TYPES.OTHER]: <Sparkles className="h-4 w-4" />,
  };
  
  const shiftColors: Record<ShiftType, string> = {
    [SHIFT_TYPES.WORK]: 'bg-primary/20 text-primary-foreground',
    [SHIFT_TYPES.OFF]: 'bg-secondary',
    [SHIFT_TYPES.VACATION]: 'bg-accent/30 text-accent-foreground',
    [SHIFT_TYPES.OTHER]: 'bg-muted',
  };

  const modifiers = {
    today: new Date(),
    ...scheduleDays.reduce((acc, day) => {
      if (day.type !== 'Empty') {
        const key = day.type.toLowerCase().replace(' ', '-');
        if (!acc[key]) acc[key] = [];
        acc[key].push(day.date);
      }
      return acc;
    }, {} as Record<string, Date[]>),
  };
  
  const modifiersClassNames = {
    today: 'border-2 border-accent rounded-full',
    trabalho: 'bg-primary/20',
    folga: 'bg-indigo-200',
    férias: 'bg-accent/30',
    outro: 'bg-muted',
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <AppLogo className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold font-headline">EscalaFlex</h1>
        </div>
        <div className="flex items-center gap-2">
           <PatternOptimizerDialog pattern={pattern} overrides={overrides} />
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

  const shiftClasses = {
    [SHIFT_TYPES.WORK]: 'bg-sky-200 text-sky-800',
    [SHIFT_TYPES.OFF]: 'bg-gray-200 text-gray-700',
    [SHIFT_TYPES.VACATION]: 'bg-green-200 text-green-800',
    [SHIFT_TYPES.OTHER]: 'bg-purple-200 text-purple-800',
  };

  const shiftIcons = {
    [SHIFT_TYPES.WORK]: <Briefcase className="w-3 h-3" />,
    [SHIFT_TYPES.OFF]: <Home className="w-3 h-3" />,
    [SHIFT_TYPES.VACATION]: <Plane className="w-3 h-3" />,
    [SHIFT_TYPES.OTHER]: <Sparkles className="w-3 h-3" />,
  };

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
            <div className={cn("mt-1 text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1", shiftClasses[dayInfo.type])}>
              {shiftIcons[dayInfo.type]}
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
  const form = useForm<z.infer<typeof editDaySchema>>({
    resolver: zodResolver(editDaySchema),
    defaultValues: { type: dayInfo.type as ShiftType, note: dayInfo.note },
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

// Sub-component: Monthly Summary
function MonthlySummary({ scheduleDays }: { scheduleDays: DayInfo[] }) {
  const summary = useMemo(() => {
    return scheduleDays.reduce((acc, day) => {
      if (day.type !== 'Empty') {
        acc[day.type] = (acc[day.type] || 0) + 1;
      }
      return acc;
    }, {} as Record<ShiftType, number>);
  }, [scheduleDays]);

  return (
    <Card>
      <CardHeader><CardTitle>Resumo do Mês</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(summary).map(([type, count]) => (
            <div key={type} className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">{type}</div>
              <div className="text-2xl font-bold">{count}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Sub-component: AI Pattern Optimizer
function PatternOptimizerDialog({ pattern, overrides }: { pattern: ShiftPattern, overrides: Overrides }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SuggestPatternAdjustmentsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleOptimization = async () => {
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
      const res = await suggestPatternAdjustments({ originalSchedulePattern, editedSchedule });
      setResult(res);
    } catch (e) {
      console.error(e);
      setError('Ocorreu um erro ao contatar a IA. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Bot className="mr-2 h-4 w-4" />
          Otimizar Padrão
        </Button>
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
            </div>
          ) : (
             <div className="text-center text-muted-foreground p-4">
                Clique no botão abaixo para iniciar a otimização.
             </div>
          )}
        </div>
        <DialogFooter>
          {result ? (
            <Button onClick={() => { setResult(null); setError(null); }}>Analisar Novamente</Button>
          ) : (
            <Button onClick={handleOptimization} disabled={isLoading}>
              {isLoading ? 'Analisando...' : 'Sugerir Novo Padrão'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
