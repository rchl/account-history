declare namespace Account {
    interface DataLine {
        id: string,
        accountId: string;
        amount: number;
        currency: string;
        date: Date;
        text: string;
        tags: string[];
    }

    type Processor = (lines: string[]) => Account.DataLine[]

    interface ProcessedDataLine {
        expenses: number,
        income: number,
        label: string,
    }

    interface ProcessedData {
        data: ProcessedDataLine[]
        averageIncome: string
        averageSpendings: string
    }

    type ChartSerie = {
        meta: string
        value: number
    }

    type ChartData = {
        labels: string[]
        series: [ChartSerie[], ChartSerie[]]
    }
}

declare module 'vue-chartist' {
    import { Plugin } from 'vue'
    const plugin: Plugin
    export default plugin
}
